const fs = require('fs');
const path = require('path');

const SotrudnikProcedures = require('../../models/SotrudnikProcedures');
const TestProcedures = require('../../models/TestProcedures');
const db = require('../../config/database');

const { rtfToHtml, rtfFragmentToHtml } = require('../../lib/test_upload/rtfParser');
const { tilmashFix } = require('../../lib/test_upload/tilmashFix');
const { parseQuestions } = require('../../lib/test_upload/questionParser');
const { validateQuestions } = require('../../lib/test_upload/testValidator');

// Справочник типов теста (захардкожен — отдельной таблицы нет).
const TEST_TYPES = [
  { id: 1, name_ru: 'Тренажёр',  name_kk: 'Тренажёр',  name_en: 'Practice' },
  { id: 2, name_ru: 'Рубежный',  name_kk: 'Аралық',    name_en: 'Midterm'  },
  { id: 3, name_ru: 'Итоговый',  name_kk: 'Қорытынды', name_en: 'Final'    },
];

function getTestTypesLocalized(lang) {
  const key = `name_${lang}`;
  return TEST_TYPES.map(t => ({ id: t.id, name: t[key] || t.name_ru }));
}

class TestUploadController {

  // GET /test-upload — главная страница со списком тестов
  static async index(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) return res.status(401).json({ ok: false, error: 'Not authenticated' });

      const yazyk_id = req.session.lang || 'ru';

      const [semestrResult, tests] = await Promise.all([
        db.query(`SELECT semestr_id, semestr_nomer FROM public.semestr ORDER BY semestr_nomer`),
        TestProcedures.listBySotrudnik(req.session.userId, { limit: 200 })
      ]);

      res.json({ ok: true, data: { semestr_list: semestrResult.rows, test_types: getTestTypesLocalized(yazyk_id), tests } });
    } catch (error) {
      console.error('TestUpload index error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  // POST /test-upload/disciplines — каскад: дисциплины препода в семестре
  static async getDisciplines(req, res) {
    try {
      const { id_semestr } = req.body;
      const id_sotrudnik = req.session.userId;
      if (!id_semestr) return res.json([]);
      const rows = await TestProcedures.disciplinaList(id_sotrudnik, id_semestr);
      res.json(rows);
    } catch (error) {
      console.error('getDisciplines error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // POST /test-upload/parse — приём RTF, парсинг, сохранение в сессию
  // Возвращает JSON (для AJAX с progress bar)
  static async parseRtf(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: req.t('test_upload.errors.no_file') });
      }

      const rtfPath = req.file.path;
      const outputDir = path.dirname(rtfPath);
      const disableSymbolCheck = req.body.disable_symbol_check === 'on';

      const id_disciplina = parseInt(req.body.id_disciplina, 10);
      const id_yazyk      = parseInt(req.body.id_yazyk, 10);
      const id_nedelya    = parseInt(req.body.id_nedelya, 10);
      const test_type     = parseInt(req.body.test_type, 10);

      console.log('parseRtf body:', { id_disciplina, id_yazyk, id_nedelya, test_type, file: req.file?.originalname });

      if (!id_disciplina || !id_yazyk || !id_nedelya || !test_type) {
        console.log('parseRtf validation failed:', req.body);
        try { fs.unlinkSync(rtfPath); } catch (e) {}
        return res.status(400).json({ error: 'Заполните все поля формы' });
      }

      // RTF -> HTML
      let html = await rtfToHtml(rtfPath, outputDir);
      html = tilmashFix(html);
      html = html.replace(/<br\s*\/?>/gi, '</p><p>');

      const questions = parseQuestions(html);
      const { correct, incorrect } = validateQuestions(questions, disableSymbolCheck);

      req.session.parsedTest = {
        questions,
        correct,
        incorrect,
        disableSymbolCheck,
        id_disciplina,
        id_yazyk,
        id_nedelya,
        test_type,
      };

      const sessionSize = JSON.stringify(req.session.parsedTest).length;
      console.log(`parseRtf OK: ${questions.length} questions (${correct.length} correct, ${incorrect.length} incorrect), session size: ${(sessionSize / 1024).toFixed(1)} KB`);

      try { fs.unlinkSync(rtfPath); } catch (e) {}

      // Явно сохраняем сессию перед ответом
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Ошибка сохранения: файл слишком большой' });
        }
        res.json({
          ok: true,
          total: questions.length,
          correct: correct.length,
          incorrect: incorrect.length,
          redirect: '/test-upload/preview'
        });
      });
    } catch (err) {
      console.error('parseRtf error:', err);
      try { if (req.file) fs.unlinkSync(req.file.path); } catch (e) {}
      res.status(500).json({ error: `${req.t('test_upload.errors.parse_failed')}: ${err.message}` });
    }
  }

  // GET /test-upload/preview
  static async preview(req, res) {
    try {
      const data = req.session.parsedTest;
      if (!data) {
        return res.json({ ok: false, error: 'Нет данных для предпросмотра' });
      }

      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);

      res.json({ ok: true, data: { correct: data.correct, incorrect: data.incorrect, total: data.questions.length } });
    } catch (error) {
      console.error('preview error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  // POST /test-upload/save — сохранить распарсенный тест в БД
  static async saveTest(req, res) {
    const data = req.session.parsedTest;
    if (!data) {
      return res.json({ ok: false, error: 'Нет данных для сохранения' });
    }
    if (!data.correct.length) {
      return res.json({ ok: false, error: req.t('test_upload.errors.no_questions') });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const createRow = (await client.query(
        `SELECT * FROM public.test_create($1::bigint, $2::bigint, $3::bigint, $4::bigint, $5::smallint)`,
        [data.id_disciplina, data.id_yazyk, req.session.userId, data.id_nedelya, data.test_type]
      )).rows[0];

      if (createRow.out_code !== 1) throw new Error(createRow.out_message);
      const testId = createRow.out_test_id;

      for (const q of data.correct) {
        const qRow = (await client.query(
          `SELECT * FROM public.test_question_insert($1::bigint, $2::varchar)`,
          [testId, q.html]
        )).rows[0];
        if (qRow.out_code !== 1) throw new Error(qRow.out_message);

        for (const a of q.answers) {
          const aRow = (await client.query(
            `SELECT * FROM public.test_answer_insert($1::bigint, $2::varchar, $3::smallint)`,
            [qRow.out_question_id, a.html, a.isTrue ? 1 : 0]
          )).rows[0];
          if (aRow.out_code !== 1) throw new Error(aRow.out_message);
        }
      }

      await client.query('COMMIT');
      delete req.session.parsedTest;

      res.json({ ok: true, testId });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('saveTest error:', error);
      res.json({ ok: false, error: error.message });
    } finally {
      client.release();
    }
  }

  // GET /test-upload/manage/:id — управление вопросами (рендерит пустую оболочку, данные грузятся AJAX)
  static async manageQuestions(req, res) {
    try {
      const id_test = parseInt(req.params.id, 10);
      const owner = await TestProcedures.getOwner(id_test);
      if (!owner) return res.status(404).json({ ok: false, error: 'Тест не найден' });
      if (owner != req.session.userId) {
        return res.status(403).json({ ok: false, error: req.t('error.access_denied') });
      }

      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);

      res.json({ ok: true, data: { id_test } });
    } catch (error) {
      console.error('manageQuestions error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  // GET /test-upload/manage/:id/questions — AJAX пагинированная загрузка вопросов
  static async getQuestionsPaginated(req, res) {
    try {
      const id_test = parseInt(req.params.id, 10);
      const owner = await TestProcedures.getOwner(id_test);
      if (!owner) return res.status(404).json({ error: 'Not found' });
      if (owner != req.session.userId) return res.status(403).json({ error: 'Forbidden' });

      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
      const status = req.query.status || 'all';
      const search = (req.query.search || '').trim();

      const data = await TestProcedures.questionsPaginated(id_test, { page, limit, status, search });
      res.json(data);
    } catch (error) {
      console.error('getQuestionsPaginated error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // POST /test-upload/question/toggle — AJAX
  static async toggleQuestion(req, res) {
    try {
      const { id, status } = req.body;
      // Проверяем владельца через JOIN
      const ownerCheck = await db.query(
        `SELECT t.id_sotrudnik
           FROM public.test_question q
           JOIN public.test t ON t.test_id = q.id_test
          WHERE q.test_question_id = $1::bigint`,
        [id]
      );
      if (!ownerCheck.rows.length) return res.status(404).json({ error: 'Not found' });
      if (ownerCheck.rows[0].id_sotrudnik != req.session.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const row = await TestProcedures.toggleQuestion(id, status);
      if (row.out_code !== 1) return res.status(500).json({ error: row.out_message });
      res.json({ ok: true });
    } catch (error) {
      console.error('toggleQuestion error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // POST /test-upload/question/update — AJAX, обновление текста вопроса
  static async updateQuestion(req, res) {
    try {
      const { id, value } = req.body;
      if (!id || value === undefined) return res.status(400).json({ error: 'Missing id or value' });

      const ownerCheck = await db.query(
        `SELECT t.id_sotrudnik
           FROM public.test_question q
           JOIN public.test t ON t.test_id = q.id_test
          WHERE q.test_question_id = $1::bigint`,
        [id]
      );
      if (!ownerCheck.rows.length) return res.status(404).json({ error: 'Not found' });
      if (ownerCheck.rows[0].id_sotrudnik != req.session.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const row = await TestProcedures.updateQuestion(id, value);
      if (row.out_code !== 1) return res.status(500).json({ error: row.out_message });
      res.json({ ok: true });
    } catch (error) {
      console.error('updateQuestion error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // POST /test-upload/answer/update — AJAX, обновление текста и статуса ответа
  static async updateAnswer(req, res) {
    try {
      const { id, value, status } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const ownerCheck = await db.query(
        `SELECT t.id_sotrudnik
           FROM public.test_answer a
           JOIN public.test_question q ON q.test_question_id = a.id_question
           JOIN public.test t ON t.test_id = q.id_test
          WHERE a.test_answer_id = $1::bigint`,
        [id]
      );
      if (!ownerCheck.rows.length) return res.status(404).json({ error: 'Not found' });
      if (ownerCheck.rows[0].id_sotrudnik != req.session.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const row = await TestProcedures.updateAnswer(id, value, status);
      if (row.out_code !== 1) return res.status(500).json({ error: row.out_message });
      res.json({ ok: true });
    } catch (error) {
      console.error('updateAnswer error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // POST /test-upload/convert-formula — конвертация RTF из clipboard в HTML с base64 картинками
  static async convertFormula(req, res) {
    try {
      const { rtf } = req.body;
      if (!rtf) return res.status(400).json({ error: 'Missing rtf data' });

      const html = await rtfFragmentToHtml(rtf);
      res.json({ ok: true, html });
    } catch (error) {
      console.error('convertFormula error:', error);
      res.status(500).json({ error: error.message || 'Ошибка конвертации формулы' });
    }
  }

  // DELETE /test-upload/:id
  static async deleteTest(req, res) {
    try {
      const id_test = parseInt(req.params.id, 10);
      const row = await TestProcedures.deleteTest(id_test, req.session.userId);
      if (row.out_code !== 1) return res.status(400).json({ error: row.out_message });
      res.json({ ok: true });
    } catch (error) {
      console.error('deleteTest error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // POST /test-upload/config/:id
  static async saveConfig(req, res) {
    try {
      const id_test = parseInt(req.params.id, 10);
      const max_minute = parseInt(req.body.max_minute, 10);
      const max_question = parseInt(req.body.max_question, 10);

      const owner = await TestProcedures.getOwner(id_test);
      if (owner != req.session.userId) return res.status(403).json({ error: 'Forbidden' });

      const row = await TestProcedures.saveConfig(id_test, max_minute, max_question);
      if (row.out_code !== 1) return res.status(500).json({ error: row.out_message });
      res.json({ ok: true });
    } catch (error) {
      console.error('saveConfig error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // POST /test-upload/raspisanie/:id
  static async saveRaspisanie(req, res) {
    try {
      const id_test = parseInt(req.params.id, 10);
      const { id_plan, id_gruppa_student, start } = req.body;

      const owner = await TestProcedures.getOwner(id_test);
      if (owner != req.session.userId) return res.status(403).json({ error: 'Forbidden' });

      const row = await TestProcedures.saveRaspisanie(id_plan, id_gruppa_student, id_test, start);
      if (row.out_code !== 1) return res.status(500).json({ error: row.out_message });
      res.json({ ok: true, id: row.out_raspisanie_id });
    } catch (error) {
      console.error('saveRaspisanie error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // GET /test-upload/raspisanie/:id
  static async listRaspisanie(req, res) {
    try {
      const id_test = parseInt(req.params.id, 10);
      const owner = await TestProcedures.getOwner(id_test);
      if (owner != req.session.userId) return res.status(403).json({ error: 'Forbidden' });
      const rows = await TestProcedures.listRaspisanie(id_test);
      res.json(rows);
    } catch (error) {
      console.error('listRaspisanie error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = TestUploadController;
