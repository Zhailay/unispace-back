const SotrudnikProcedures = require('../../models/SotrudnikProcedures');
const db = require('../../config/database');

class PlanController {

  static async staffPlan(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) return res.status(401).json({ ok: false, error: 'Not authenticated' });

      const yazyk_id = req.session.lang || 'ru';

      const [spec_list, forma_obuch_list, god_list, kurs_list, period_obuch_list, modul_name_list, obsh_name_list, yazyk_list, forma_kontrolya_list, semestrResult, disciplinaResult] = await Promise.all([
        SotrudnikProcedures.getSpecList(yazyk_id),
        SotrudnikProcedures.getFormaObuchList(yazyk_id),
        SotrudnikProcedures.getGodList(),
        SotrudnikProcedures.getKursList(),
        SotrudnikProcedures.getPeriodObuchList(yazyk_id),
        SotrudnikProcedures.getModulNameList(yazyk_id),
        SotrudnikProcedures.getObshNameList(yazyk_id),
        SotrudnikProcedures.getYazykList(yazyk_id),
        SotrudnikProcedures.getFormaKontrolyaList(yazyk_id),
        db.query(`SELECT * FROM public.semestr ORDER BY semestr_id`),
        db.query(
          `SELECT disciplina_id,
                  CASE WHEN $1 = 'kk' THEN disciplina_kz
                       WHEN $1 = 'ru' THEN disciplina_ru
                       ELSE disciplina_en END AS disciplina_name
           FROM public.disciplina ORDER BY disciplina_id`,
          [yazyk_id]
        )
      ]);

      res.json({
        ok: true,
        data: {
                spec_list,
        forma_obuch_list,
        god_list,
        kurs_list,
        semestr_list: semestrResult.rows,
        period_obuch_list,
        modul_name_list,
        obsh_name_list,
        yazyk_list,
        forma_kontrolya_list,
        disciplina_list: disciplinaResult.rows,
        kurs_label: req.t('plan.kurs')
      });
    } catch (error) {
      console.error('Staff plan error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async insertPlan(req, res) {
    try {
      const {
        id_spec, id_forma_obuch, id_god, id_kurs, id_semestr, id_period_obuch, id_disciplina,
        plan_kod, plan_ro_kz, plan_ro_ru, plan_ro_en,
        id_modul_name, id_obsh_name, id_forma_kontrolya,
        id_yazyk_kaz, id_yazyk_rus, id_yazyk_angl, id_yazyk_poliaz
      } = req.body;

      if (!id_spec || !id_forma_obuch || !id_god || !id_kurs || !id_semestr || !id_period_obuch || !id_disciplina) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      const result = await db.query(
        `SELECT * FROM public.plan_full(
           $1::integer,  $2::varchar,
           $3::bigint,   $4::bigint,   $5::smallint, $6::bigint,
           $7::bigint,   $8::bigint,   $9::bigint,   $10::bigint,  $11::bigint,
           $12::varchar, $13::varchar, $14::varchar, $15::varchar,
           $16::bigint,  $17::bigint,  $18::bigint,
           $19::bigint,  $20::bigint,  $21::bigint,  $22::bigint
         )`,
        [
          1, null,
          null, id_disciplina, null, id_kurs,
          id_spec, id_forma_obuch, id_god, id_semestr, id_period_obuch,
          plan_kod || null, plan_ro_kz || null, plan_ro_ru || null, plan_ro_en || null,
          id_modul_name || null, id_obsh_name || null, id_forma_kontrolya || null,
          id_yazyk_kaz || null, id_yazyk_rus || null, id_yazyk_angl || null, id_yazyk_poliaz || null
        ]
      );

      const row = result.rows[0];
      if (row && row.out_code === 1) return res.json({ ok: true });
      if (row && row.out_code === 2) return res.json({ ok: false, error: 'Такая запись уже существует в плане' });
      if (row && row.out_code === 3) return res.json({ ok: false, error: 'Контингент не найден для выбранных параметров' });
      if (row && row.out_code === 4) return res.json({ ok: false, error: 'Запись календаря не найдена для выбранных параметров' });
      return res.json({ ok: false, error: 'Неизвестная ошибка' });
    } catch (error) {
      console.error('Ошибка при добавлении записи плана:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async updatePlan(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) return res.status(401).json({ ok: false, error: 'Не авторизован' });

      const {
        plan_id, id_disciplina,
        plan_kod, plan_ro_kz, plan_ro_ru, plan_ro_en,
        id_modul_name, id_obsh_name, id_forma_kontrolya,
        id_yazyk_kaz, id_yazyk_rus, id_yazyk_angl, id_yazyk_poliaz
      } = req.body;

      if (!plan_id || !id_disciplina) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      const result = await db.query(
        `SELECT * FROM public.plan_full(
           $1::integer, NULL,
           $2::bigint,  $3::bigint,  NULL, NULL,
           NULL, NULL, NULL, NULL, NULL,
           $4::varchar, $5::varchar, $6::varchar, $7::varchar,
           $8::bigint,  $9::bigint,  $10::bigint,
           $11::bigint, $12::bigint, $13::bigint, $14::bigint
         )`,
        [
          2, plan_id, id_disciplina,
          plan_kod || null, plan_ro_kz || null, plan_ro_ru || null, plan_ro_en || null,
          id_modul_name || null, id_obsh_name || null, id_forma_kontrolya || null,
          id_yazyk_kaz || null, id_yazyk_rus || null, id_yazyk_angl || null, id_yazyk_poliaz || null
        ]
      );

      const row = result.rows[0];
      if (row && row.out_code === 1) return res.json({ ok: true });
      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при обновлении записи плана:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async deletePlan(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) return res.status(401).json({ ok: false, error: 'Не авторизован' });

      const { plan_id } = req.body;
      if (!plan_id) return res.json({ ok: false, error: 'Не указан идентификатор' });

      await db.query(
        `SELECT 1 FROM public.plan_full($1::integer, NULL, $2::bigint)`,
        [3, plan_id]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при удалении записи плана:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async selectPlan(req, res) {
    try {
      const yazyk_id       = req.session.lang || 'ru';
      const id_kurs        = req.body.id_kurs        || null;
      const id_spec        = req.body.id_spec        || null;
      const id_forma_obuch = req.body.id_forma_obuch || null;
      const id_god         = req.body.id_god         || null;

      const result = await db.query(
        `SELECT * FROM public.plan_full(
           $1::integer, $2::varchar,
           NULL, NULL, NULL, $3::bigint,
           $4::bigint, $5::bigint, $6::bigint
         ) ORDER BY out_plan_id`,
        [4, yazyk_id, id_kurs, id_spec, id_forma_obuch, id_god]
      );

      return res.json({ ok: true, data: result.rows });
    } catch (error) {
      console.error('Ошибка при получении списка плана:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async selectPeriodObuch(req, res) {
    try {
      
      const yazyk_id = req.session.lang || 'ru';
      const id_kurs        = req.body.id_kurs        || null;
      const id_semestr        = req.body.id_semestr        || null;

      const result = await db.query(
        `SELECT * FROM public.period_obuch_kalendar_spisok(
           $1::varchar, $2::integer, $3::integer
         )`,
        [yazyk_id,  id_kurs, id_semestr]
      );

     

      return res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Ошибка при получении списка процесса обучения:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async selectPoiskDisciplina(req, res) {
    try {
      
      const yazyk_id = req.session.lang || 'ru';
      const disciplina_value        = req.body.disciplina_value        || null;

      const result = await db.query(
        `SELECT * FROM public.disciplina_poisk(
           $1::varchar, $2::varchar
         )`,
        [yazyk_id, disciplina_value]
      );

     

      return res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Ошибка при получении списка дисциплин:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

}

module.exports = PlanController;
