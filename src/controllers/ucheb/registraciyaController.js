const SotrudnikProcedures = require('../../models/SotrudnikProcedures');
const db = require('../../config/database');

class RegistraciyaController {

  static async staffRegistraciya(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) return res.status(401).json({ ok: false, error: 'Not authenticated' });

      const yazyk_id = req.session.lang || 'ru';

      const [spec_list, god_list, forma_obuch_list, kurs_list, semestrResult, teacherResult] = await Promise.all([
        SotrudnikProcedures.getSpecList(yazyk_id),
        SotrudnikProcedures.getGodList(),
        SotrudnikProcedures.getFormaObuchList(yazyk_id),
        SotrudnikProcedures.getKursList(),
        db.query(`SELECT semestr_id, semestr_nomer FROM public.semestr ORDER BY semestr_nomer`),
        db.query(
          `SELECT sotrudnik_id,
                  CONCAT_WS(' ', sotrudnik_familiya, sotrudnik_imya, sotrudnik_otchestvo) AS sotrudnik_fio
           FROM public.sotrudnik
           ORDER BY sotrudnik_familiya, sotrudnik_imya`
        )
      ]);

      res.json({ ok: true, data: { spec_list, god_list, forma_obuch_list, kurs_list, semestr_list: semestrResult.rows, teacher_list: teacherResult.rows } });
    } catch (error) {
      console.error('Staff registraciya error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async getDisciplinaList(req, res) {
    try {
      const { id_kontingent, id_semestr, id_kurs } = req.body;
      if (!id_kontingent || !id_semestr) {
        return res.json({ ok: false, error: 'Не указаны все параметры' });
      }

      const yazyk_id = req.session.lang || 'ru';

      const result = await db.query(
        `SELECT * FROM public.disciplina_plan_spisok($1::bigint, $2::bigint, $3::varchar, $4::bigint)`,
        [id_kontingent, id_semestr, yazyk_id, id_kurs || null]
      );

      return res.json({ ok: true, data: result.rows });
    } catch (error) {
      console.error('Ошибка при загрузке дисциплин:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

 static async getGruppaBySpec(req, res) {
    try {
      const { id_god, id_spec, id_forma_obuch } = req.body;
      if (!id_god || !id_spec || !id_forma_obuch) {
        return res.json({ ok: false, error: 'Не указаны все параметры' });
      }

      const result = await db.query(
        `SELECT * FROM public.gruppa_spisok_reg($1::bigint, $2::bigint, $3::bigint)`,
        [id_god, id_spec, id_forma_obuch]
      );

      return res.json({ ok: true, data: result.rows });
    } catch (error) {
      console.error('Ошибка при загрузке групп:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async saveRegistraciya(req, res) {
    try {
      const { id_plan_vid_zanyatiya, id_sotrudnik, id_plan, id_otdelenie, student_ids } = req.body;

      if (!id_plan_vid_zanyatiya || !id_sotrudnik || !id_plan || !id_otdelenie || !student_ids || !student_ids.length) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля и выберите студентов' });
      }

      const ids = Array.isArray(student_ids) ? student_ids.map(Number) : [Number(student_ids)];

      const result = await db.query(
        `SELECT * FROM public.registraciya_full(1, NULL, $1::bigint, $2::bigint, $3::bigint, $4::bigint, $5::bigint[])`,
        [id_plan_vid_zanyatiya, id_sotrudnik, id_plan, id_otdelenie, ids]
      );

      const row = result.rows[0];
      if (row && row.out_code === 1) return res.json({ ok: true });
      if (row && row.out_code === 2) return res.json({ ok: false, error: 'Язык преподавания не найден для выбранных параметров' });
      return res.json({ ok: false, error: 'Неизвестная ошибка' });
    } catch (error) {
      console.error('Ошибка при сохранении регистрации:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async deleteRegistraciya(req, res) {
    try {
      const { id_plan_vid_zanyatiya, student_ids } = req.body;

      if (!id_plan_vid_zanyatiya || !student_ids || !student_ids.length) {
        return res.json({ ok: false, error: 'Выберите вид занятия и студентов для удаления' });
      }

      const ids = Array.isArray(student_ids) ? student_ids.map(Number) : [Number(student_ids)];

      const result = await db.query(
        `SELECT * FROM public.registraciya_full(2, NULL, $1::bigint, NULL, NULL, NULL, $2::bigint[])`,
        [id_plan_vid_zanyatiya, ids]
      );

      const row = result.rows[0];
      if (row && row.out_code === 1) return res.json({ ok: true });
      return res.json({ ok: false, error: 'Неизвестная ошибка' });
    } catch (error) {
      console.error('Ошибка при удалении регистрации:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async getStudentList(req, res) {
    try {
      const { id_gruppa } = req.body;
      if (!id_gruppa) {
        return res.json({ ok: false, error: 'Не указан id_gruppa' });
      }

      const result = await db.query(
        `SELECT * FROM public.student_gruppa_spisok($1::bigint)`,
        [id_gruppa]
      );

      return res.json({ ok: true, data: result.rows });
    } catch (error) {
      console.error('Ошибка при загрузке студентов:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async getRegistraciyaTable(req, res) {
    try {
      const { id_gruppa, id_plan } = req.body;
      if (!id_gruppa || !id_plan) {
        return res.json({ ok: false, error: 'Не указаны параметры' });
      }

      const result = await db.query(
        `SELECT * FROM public.registraciya_full(4, NULL, NULL, NULL, $1::bigint, NULL, NULL, $2::bigint)`,
        [id_plan, id_gruppa]
      );

      return res.json({ ok: true, data: result.rows });
    } catch (error) {
      console.error('Ошибка при загрузке таблицы регистрации:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async getVidZanyatiyaList(req, res) {
    try {
      const { id_plan } = req.body;
      if (!id_plan) {
        return res.json({ ok: false, error: 'Не указан id_plan' });
      }

      const yazyk_id = req.session.lang || 'ru';

      const result = await db.query(
        `SELECT * FROM public.plan_vid_zanyatiya_spisok($1::bigint, $2::varchar)`,
        [id_plan, yazyk_id]
      );

      return res.json({ ok: true, data: result.rows });
    } catch (error) {
      console.error('Ошибка при загрузке видов занятий:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

}

module.exports = RegistraciyaController;
