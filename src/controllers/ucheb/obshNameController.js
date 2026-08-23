const SotrudnikProcedures = require('../../models/SotrudnikProcedures');
const db = require('../../config/database');

class ObshNameController {

  static async staffObshName(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      res.json({ ok: true, data: {} });
    } catch (error) {
      console.error('Staff obsh_name error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async insertObshName(req, res) {
    try {
      const { obsh_name_kz, obsh_name_ru, obsh_name_en, obsh_name_short_kz, obsh_name_short_ru, obsh_name_short_en } = req.body;

      if (!obsh_name_kz || !obsh_name_ru || !obsh_name_en || !obsh_name_short_kz || !obsh_name_short_ru || !obsh_name_short_en) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      const result = await db.query(
        `SELECT * FROM public.obsh_name_full($1::integer, $2::varchar, $3::integer, $4::integer, $5::bigint, $6::varchar, $7::varchar, $8::varchar, $9::varchar, $10::varchar, $11::varchar)`,
        [1, null, null, null, null, obsh_name_kz, obsh_name_ru, obsh_name_en, obsh_name_short_kz, obsh_name_short_ru, obsh_name_short_en]
      );

      const row = result.rows[0];
      if (row.out_code === 1) return res.json({ ok: true });
      if (row.out_code === 2) return res.json({ ok: false, error: 'Такой общий модуль уже существует' });
      return res.json({ ok: false, error: 'Неизвестная ошибка' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: 'Ошибка при добавлении общего модуля' });
    }
  }

  static async updateObshName(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) return res.status(401).json({ ok: false, error: 'Не авторизован' });

      const { obsh_name_id, obsh_name_kz, obsh_name_ru, obsh_name_en, obsh_name_short_kz, obsh_name_short_ru, obsh_name_short_en } = req.body;

      if (!obsh_name_id || !obsh_name_kz || !obsh_name_ru || !obsh_name_en || !obsh_name_short_kz || !obsh_name_short_ru || !obsh_name_short_en) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      await db.query(
        `SELECT 1 FROM public.obsh_name_full($1::integer, $2::varchar, $3::integer, $4::integer, $5::bigint, $6::varchar, $7::varchar, $8::varchar, $9::varchar, $10::varchar, $11::varchar)`,
        [2, null, null, null, obsh_name_id, obsh_name_kz, obsh_name_ru, obsh_name_en, obsh_name_short_kz, obsh_name_short_ru, obsh_name_short_en]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при обновлении общего модуля:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера при обновлении' });
    }
  }

  static async deleteObshName(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) return res.status(401).json({ ok: false, error: 'Не авторизован' });

      const { obsh_name_id } = req.body;
      if (!obsh_name_id) return res.json({ ok: false, error: 'Не указан идентификатор общего модуля' });

      await db.query(
        `SELECT 1 FROM public.obsh_name_full($1::integer, NULL, NULL, NULL, $2::bigint)`,
        [3, obsh_name_id]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при удалении общего модуля:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера при удалении' });
    }
  }

  static async selectObshName(req, res) {
    try {
      const search = req.body.search || '';
      const limit = parseInt(req.body.limit, 10) || 20;
      const offset = parseInt(req.body.offset, 10) || 0;

      const result = await db.query(
        `SELECT * FROM public.obsh_name_full($1::integer, $2::varchar, $3::integer, $4::integer) ORDER BY out_obsh_name_id`,
        [4, search || null, limit, offset]
      );

      const totalResult = await db.query(
        `SELECT COUNT(*) AS total FROM public.obsh_name
         WHERE $1::varchar IS NULL
            OR obsh_name_kz       ILIKE '%' || $1 || '%'
            OR obsh_name_ru       ILIKE '%' || $1 || '%'
            OR obsh_name_en       ILIKE '%' || $1 || '%'
            OR obsh_name_short_kz ILIKE '%' || $1 || '%'
            OR obsh_name_short_ru ILIKE '%' || $1 || '%'
            OR obsh_name_short_en ILIKE '%' || $1 || '%'`,
        [search || null]
      );

      return res.json({
        ok: true,
        data: result.rows,
        totalCount: parseInt(totalResult.rows[0].total, 10)
      });
    } catch (error) {
      console.error('Ошибка при получении списка общих модулей:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }
}

module.exports = ObshNameController;
