const SotrudnikProcedures = require('../../models/SotrudnikProcedures');
const db = require('../../config/database');

class ModulNameController {

  static async staffModulName(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }
      const tipModulList = await SotrudnikProcedures.getTipModulList(req.session.lang);

      res.json({
        ok: true,
        data: { tipModulList }
      });
    } catch (error) {
      console.error('Staff modul_name error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async insertModulName(req, res) {
    try {
      const { modul_name_kz, modul_name_ru, modul_name_en, modul_name_short_kz, modul_name_short_ru, modul_name_short_en, id_tip_modul } = req.body;

      if (!modul_name_kz || !modul_name_ru || !modul_name_en || !modul_name_short_kz || !modul_name_short_ru || !modul_name_short_en || !id_tip_modul) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      const result = await db.query(
        `SELECT * FROM public.modul_name_full($1::integer, $2::varchar, $3::integer, $4::integer, $5::bigint, $6::varchar, $7::varchar, $8::varchar, $9::varchar, $10::varchar, $11::varchar, $12::bigint)`,
        [1, null, null, null, null, modul_name_kz, modul_name_ru, modul_name_en, modul_name_short_kz, modul_name_short_ru, modul_name_short_en, id_tip_modul]
      );

      const row = result.rows[0];
      if (row.out_code === 1) return res.json({ ok: true });
      if (row.out_code === 2) return res.json({ ok: false, error: 'Такой модуль уже существует' });
      return res.json({ ok: false, error: 'Неизвестная ошибка' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: 'Ошибка при добавлении модуля' });
    }
  }

  static async updateModulName(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) return res.status(401).json({ ok: false, error: 'Не авторизован' });

      const { modul_name_id, modul_name_kz, modul_name_ru, modul_name_en, modul_name_short_kz, modul_name_short_ru, modul_name_short_en, id_tip_modul } = req.body;

      if (!modul_name_id || !modul_name_kz || !modul_name_ru || !modul_name_en || !modul_name_short_kz || !modul_name_short_ru || !modul_name_short_en || !id_tip_modul) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      await db.query(
        `SELECT 1 FROM public.modul_name_full($1::integer, $2::varchar, $3::integer, $4::integer, $5::bigint, $6::varchar, $7::varchar, $8::varchar, $9::varchar, $10::varchar, $11::varchar, $12::bigint)`,
        [2, null, null, null, modul_name_id, modul_name_kz, modul_name_ru, modul_name_en, modul_name_short_kz, modul_name_short_ru, modul_name_short_en, id_tip_modul]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при обновлении модуля:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера при обновлении' });
    }
  }

  static async deleteModulName(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) return res.status(401).json({ ok: false, error: 'Не авторизован' });

      const { modul_name_id } = req.body;
      if (!modul_name_id) return res.json({ ok: false, error: 'Не указан идентификатор модуля' });

      await db.query(
        `SELECT 1 FROM public.modul_name_full($1::integer, NULL, NULL, NULL, $2::bigint)`,
        [3, modul_name_id]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при удалении модуля:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера при удалении' });
    }
  }

  static async selectModulName(req, res) {
    try {
      const search = req.body.search || '';
      const limit = parseInt(req.body.limit, 10) || 20;
      const offset = parseInt(req.body.offset, 10) || 0;

      const result = await db.query(
        `SELECT * FROM public.modul_name_full($1::integer, $2::varchar, $3::integer, $4::integer) ORDER BY out_modul_name_id`,
        [4, search || null, limit, offset]
      );

      const totalResult = await db.query(
        `SELECT COUNT(*) AS total FROM public.modul_name
         WHERE $1::varchar IS NULL
            OR modul_name_kz       ILIKE '%' || $1 || '%'
            OR modul_name_ru       ILIKE '%' || $1 || '%'
            OR modul_name_en       ILIKE '%' || $1 || '%'
            OR modul_name_short_kz ILIKE '%' || $1 || '%'
            OR modul_name_short_ru ILIKE '%' || $1 || '%'
            OR modul_name_short_en ILIKE '%' || $1 || '%'`,
        [search || null]
      );

      return res.json({
        ok: true,
        data: result.rows,
        totalCount: parseInt(totalResult.rows[0].total, 10)
      });
    } catch (error) {
      console.error('Ошибка при получении списка модулей:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }
}

module.exports = ModulNameController;
