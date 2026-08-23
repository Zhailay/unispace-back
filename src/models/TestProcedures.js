const db = require('../config/database');

/**
 * Обёртки вокруг PostgreSQL функций для модуля «Загрузка тестовых вопросов».
 * Сами SQL функции — в src/database/test_functions/.
 */
class TestProcedures {

  // ---------- Тест ----------

  static async createTest({ id_disciplina, id_yazyk, id_sotrudnik, id_nedelya, test_type }) {
    const result = await db.query(
      `SELECT * FROM public.test_create($1::bigint, $2::bigint, $3::bigint, $4::bigint, $5::smallint)`,
      [id_disciplina, id_yazyk, id_sotrudnik, id_nedelya, test_type]
    );
    return result.rows[0];
  }

  static async listBySotrudnik(id_sotrudnik, { id_semestr = null, limit = 100, offset = 0 } = {}) {
    const result = await db.query(
      `SELECT * FROM public.test_list_by_sotrudnik($1::bigint, $2::bigint, $3::int, $4::int)`,
      [id_sotrudnik, id_semestr, limit, offset]
    );
    return result.rows;
  }

  static async deleteTest(id_test, id_sotrudnik) {
    const result = await db.query(
      `SELECT * FROM public.test_delete($1::bigint, $2::bigint)`,
      [id_test, id_sotrudnik]
    );
    return result.rows[0];
  }

  static async getOwner(id_test) {
    const result = await db.query(
      `SELECT id_sotrudnik FROM public.test WHERE test_id = $1::bigint`,
      [id_test]
    );
    return result.rows[0]?.id_sotrudnik || null;
  }

  // ---------- Вопросы и ответы ----------

  static async insertQuestion(id_test, value) {
    const result = await db.query(
      `SELECT * FROM public.test_question_insert($1::bigint, $2::varchar)`,
      [id_test, value]
    );
    return result.rows[0];
  }

  static async insertAnswer(id_question, value, isTrue) {
    const result = await db.query(
      `SELECT * FROM public.test_answer_insert($1::bigint, $2::varchar, $3::smallint)`,
      [id_question, value, isTrue ? 1 : 0]
    );
    return result.rows[0];
  }

  static async updateQuestion(id, value) {
    const result = await db.query(
      `SELECT * FROM public.test_question_update($1::bigint, $2::varchar)`,
      [id, value]
    );
    return result.rows[0];
  }

  static async updateAnswer(id, value, status) {
    const result = await db.query(
      `SELECT * FROM public.test_answer_update($1::bigint, $2::varchar, $3::smallint)`,
      [id, value, status]
    );
    return result.rows[0];
  }

  static async toggleQuestion(id, status) {
    const result = await db.query(
      `SELECT * FROM public.test_question_toggle($1::bigint, $2::smallint)`,
      [id, status]
    );
    return result.rows[0];
  }

  static async questionList(id_test) {
    const result = await db.query(
      `SELECT * FROM public.test_question_list($1::bigint)`,
      [id_test]
    );
    return result.rows;
  }

  static async questionWithAnswers(id_test) {
    const result = await db.query(
      `SELECT * FROM public.test_question_with_answers($1::bigint)`,
      [id_test]
    );
    return TestProcedures._groupQuestionsAnswers(result.rows);
  }

  /**
   * Серверная пагинация вопросов с фильтром и поиском.
   * Возвращает { questions: [...], total, totalActive, totalDisabled }
   */
  static async questionsPaginated(id_test, { page = 1, limit = 25, status = 'all', search = '' } = {}) {
    const offset = (page - 1) * limit;

    // Считаем общее количество (все/активные/отключённые)
    const countResult = await db.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE test_question_status = 1) AS total_active,
         COUNT(*) FILTER (WHERE test_question_status = 0) AS total_disabled
       FROM public.test_question WHERE id_test = $1`,
      [id_test]
    );
    const counts = countResult.rows[0];

    // Строим WHERE для фильтра и поиска
    const conditions = ['q.id_test = $1'];
    const params = [id_test];
    let paramIdx = 2;

    if (status === 'active') {
      conditions.push(`q.test_question_status = 1`);
    } else if (status === 'disabled') {
      conditions.push(`q.test_question_status = 0`);
    }

    if (search) {
      conditions.push(`q.test_question_value ILIKE $${paramIdx}`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    // Считаем отфильтрованное количество
    const filteredCountResult = await db.query(
      `SELECT COUNT(*) AS cnt FROM public.test_question q WHERE ${conditions.join(' AND ')}`,
      params
    );
    const filteredTotal = parseInt(filteredCountResult.rows[0].cnt);

    // Получаем вопросы текущей страницы
    const qResult = await db.query(
      `SELECT q.test_question_id, q.test_question_value, q.test_question_status
         FROM public.test_question q
        WHERE ${conditions.join(' AND ')}
        ORDER BY q.test_question_id
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    if (!qResult.rows.length) {
      return {
        questions: [],
        total: parseInt(counts.total),
        totalActive: parseInt(counts.total_active),
        totalDisabled: parseInt(counts.total_disabled),
        filteredTotal,
        page,
        totalPages: Math.ceil(filteredTotal / limit)
      };
    }

    // Получаем ответы для вопросов текущей страницы
    const questionIds = qResult.rows.map(q => q.test_question_id);
    const aResult = await db.query(
      `SELECT test_answer_id, id_question, test_answer_value, test_answer_status
         FROM public.test_answer
        WHERE id_question = ANY($1)
        ORDER BY test_answer_id`,
      [questionIds]
    );

    // Группируем
    const answersByQuestion = new Map();
    for (const a of aResult.rows) {
      if (!answersByQuestion.has(a.id_question)) answersByQuestion.set(a.id_question, []);
      answersByQuestion.get(a.id_question).push({
        test_answer_id: a.test_answer_id,
        test_answer_value: a.test_answer_value,
        test_answer_status: a.test_answer_status
      });
    }

    const questions = qResult.rows.map(q => ({
      test_question_id: q.test_question_id,
      test_question_value: q.test_question_value,
      test_question_status: q.test_question_status,
      answers: answersByQuestion.get(q.test_question_id) || []
    }));

    return {
      questions,
      total: parseInt(counts.total),
      totalActive: parseInt(counts.total_active),
      totalDisabled: parseInt(counts.total_disabled),
      filteredTotal,
      page,
      totalPages: Math.ceil(filteredTotal / limit)
    };
  }

  static _groupQuestionsAnswers(rows) {
    const grouped = new Map();
    for (const row of rows) {
      if (!grouped.has(row.question_id)) {
        grouped.set(row.question_id, {
          test_question_id: row.question_id,
          test_question_value: row.question_value,
          test_question_status: row.question_status,
          answers: []
        });
      }
      if (row.answer_id) {
        grouped.get(row.question_id).answers.push({
          test_answer_id: row.answer_id,
          test_answer_value: row.answer_value,
          test_answer_status: row.answer_status
        });
      }
    }
    return [...grouped.values()];
  }

  // ---------- Конфиг ----------

  static async saveConfig(id_test, max_minute, max_question) {
    const result = await db.query(
      `SELECT * FROM public.test_config_save($1::bigint, $2::smallint, $3::smallint)`,
      [id_test, max_minute, max_question]
    );
    return result.rows[0];
  }

  static async getConfig(id_test) {
    const result = await db.query(
      `SELECT * FROM public.test_config_get($1::bigint)`,
      [id_test]
    );
    return result.rows[0] || null;
  }

  // ---------- Расписание ----------

  static async saveRaspisanie(id_plan, id_gruppa_student, id_test, start) {
    const result = await db.query(
      `SELECT * FROM public.test_raspisanie_save($1::bigint, $2::bigint, $3::bigint, $4::timestamptz)`,
      [id_plan, id_gruppa_student, id_test, start]
    );
    return result.rows[0];
  }

  static async listRaspisanie(id_test) {
    const result = await db.query(
      `SELECT * FROM public.test_raspisanie_list($1::bigint)`,
      [id_test]
    );
    return result.rows;
  }

  // ---------- Каскадные дропдауны ----------
  // Реюзаем существующие функции journal-а — там уже есть выборка
  // дисциплин преподавателя по семестру.

  static async disciplinaList(id_sotrudnik, id_semestr) {
    const result = await db.query(
      `SELECT * FROM public.jurnal_gruppa_spisok($1::bigint, $2::bigint)`,
      [id_sotrudnik, id_semestr]
    );
    return result.rows;
  }
}

module.exports = TestProcedures;
