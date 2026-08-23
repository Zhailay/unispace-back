const SotrudnikProcedures = require('../../models/SotrudnikProcedures');
const db = require('../../config/database');

class KalendarController {

  static async staffKalendar(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      const yazyk_id = req.session.lang;

      const [spec_list, forma_obuch_list, period_obuch_list, god_list, kurs_list, semestr_result] = await Promise.all([
        SotrudnikProcedures.getSpecList(yazyk_id),
        SotrudnikProcedures.getFormaObuchList(yazyk_id),
        SotrudnikProcedures.getPeriodObuchList(yazyk_id),
        SotrudnikProcedures.getGodList(),
        SotrudnikProcedures.getKursList(),
        db.query(`SELECT * FROM public.semestr ORDER BY semestr_id`)
      ]);

      res.json({
        ok: true,
        data: {
          spec_list,
          forma_obuch_list,
          god_list,
          kurs_list,
          kurs_label: req.t('kalendar.kurs'),
          semestr_list: semestr_result.rows,
          period_obuch_list
        }
      });
    } catch (error) {
      console.error('Staff kalendar error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async insertKalendar(req, res) {
    try {
      const {
        id_spec, id_forma_obuch, id_god, id_kurs, id_semestr,
        id_period_obuch, kalendar_nachalo, kalendar_konec
      } = req.body;

      if (!id_spec || !id_forma_obuch || !id_god || !id_kurs || !id_semestr || !id_period_obuch || !kalendar_nachalo || !kalendar_konec) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      const result = await db.query(
        `SELECT * FROM public.kalendar_full($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [1, null, null, null, null, null, id_spec, id_forma_obuch, id_god, id_kurs, id_semestr, id_period_obuch, kalendar_nachalo, kalendar_konec]
      );

      const row = result.rows[0];

      if (!row) {
        return res.json({ ok: false, error: 'Не удалось добавить запись' });
      }
      if (row.out_code === 1) {
        return res.json({ ok: true });
      }
      if (row.out_code === 2) {
        return res.json({ ok: false, error: 'Такая запись уже существует' });
      }
      return res.json({ ok: false, error: 'Неизвестный результат операции' });
    } catch (error) {
      console.error('Ошибка при добавлении записи календаря:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async updateKalendar(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Не авторизован' });
      }

      const {
        kalendar_id, id_spec, id_forma_obuch, id_god, id_kurs, id_semestr,
        id_period_obuch, kalendar_nachalo, kalendar_konec
      } = req.body;

      if (!kalendar_id || !id_spec || !id_forma_obuch || !id_god || !id_kurs || !id_semestr || !id_period_obuch || !kalendar_nachalo || !kalendar_konec) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      await db.query(
        `SELECT 1 FROM public.kalendar_full($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [2, null, null, null, null, kalendar_id, id_spec, id_forma_obuch, id_god, id_kurs, id_semestr, id_period_obuch, kalendar_nachalo, kalendar_konec]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при обновлении записи календаря:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async deleteKalendar(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Не авторизован' });
      }

      const { kalendar_id } = req.body;

      if (!kalendar_id) {
        return res.json({ ok: false, error: 'Не указан идентификатор' });
      }

      await db.query(
        `SELECT 1 FROM public.kalendar_full(3, NULL, NULL, NULL, NULL, $1)`,
        [kalendar_id]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при удалении записи календаря:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async selectKalendar(req, res) {
    try {
      const limit = parseInt(req.body.limit, 10) || 20;
      const offset = parseInt(req.body.offset, 10) || 0;
      const yazyk_id = req.session.lang;
      const id_spec = req.body.id_spec || null;
      const id_forma_obuch = req.body.id_forma_obuch || null;
      const id_god = req.body.id_god || null;

      const result = await db.query(
        `SELECT * FROM public.kalendar_full(4, $1, NULL, $2, $3, NULL, $4, $5, $6) ORDER BY out_kalendar_id`,
        [yazyk_id, limit, offset, id_spec, id_forma_obuch, id_god]
      );

      const totalResult = await db.query(
        `SELECT COUNT(*) AS total
         FROM public.kalendar kal
         JOIN public.kontingent kon ON kon.kontingent_id = kal.id_kontingent
         WHERE ($1::bigint IS NULL OR kon.id_spec = $1::bigint)
           AND ($2::bigint IS NULL OR kon.id_forma_obuch = $2::bigint)
           AND ($3::bigint IS NULL OR kon.id_god = $3::bigint)`,
        [id_spec, id_forma_obuch, id_god]
      );
      const totalCount = parseInt(totalResult.rows[0].total, 10);

      return res.json({
        ok: true,
        data: result.rows,
        totalCount
      });
    } catch (error) {
      console.error('Ошибка при получении списка календаря:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }
}

module.exports = KalendarController;
