const SotrudnikProcedures = require('../../models/SotrudnikProcedures');
const db = require('../../config/database');

class SpecialtiesController {

  static async staffSpecialties(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      const yazyk_id = req.session.lang;
      const gruppaOpList = await SotrudnikProcedures.getGruppaOpList(yazyk_id);

      res.json({
        ok: true,
        data: { gruppaOpList }
      });
    } catch (error) {
      console.error('Staff specialties error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async insertSpecialties(req, res) {
    try {
      const { spec_kod, spec_kz, spec_ru, spec_en, id_gruppa_op } = req.body;

      if (!spec_kod || !spec_kz || !spec_ru || !spec_en) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      const result = await db.query(
        `SELECT * FROM public.spec_full($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          1,               // p_command
          null,
          null,            // p_spec_like
          null,            // p_limit
          null,            // p_offset
          null,            // p_spec_id
          spec_kod,        // p_spec_kod
          spec_kz,         // p_spec_kz
          spec_ru,         // p_spec_ru
          spec_en,         // p_spec_en
          id_gruppa_op || 1 // p_id_gruppa_op
        ]
      );

      const row = result.rows[0];

      if (row.out_code === 1) {
        return res.json({ ok: true });
      } else if (row.out_code === 2) {
        return res.json({ ok: false, error: 'Такая специальность уже существует' });
      } else {
        return res.json({ ok: false, error: 'Неизвестная ошибка' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: 'Ошибка при добавлении специальности' });
    }
  }

  static async deleteSpecialties(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Не авторизован' });
      }

      const { spec_id } = req.body;

      if (!spec_id) {
        return res.json({ ok: false, error: 'Не указан идентификатор специальности' });
      }

      await db.query(
        `SELECT 1 FROM public.spec_full(3, NULL, NULL, NULL, NULL, $1)`,
        [spec_id]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при удалении специальности:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера при удалении' });
    }
  }

  static async updateSpecialties(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Не авторизован' });
      }

      const { spec_id, spec_kod, spec_kz, spec_ru, spec_en, id_gruppa_op } = req.body;

      if (!spec_id || !spec_kod || !spec_kz || !spec_ru || !spec_en) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      await db.query(`
        SELECT 1 FROM public.spec_full(
          $1, NULL, NULL, NULL, NULL, $2, $3, $4, $5, $6, $7
        )`,
        [2, spec_id, spec_kod, spec_kz, spec_ru, spec_en, id_gruppa_op || 1]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при обновлении специальности:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера при обновлении' });
    }
  }

  static async selectSpecialties(req, res) {
    try {
      const search = req.body.search || '';
      const limit = parseInt(req.body.limit, 10) || 20;
      const offset = parseInt(req.body.offset, 10) || 0;
      const language = req.session.lang || 'ru';

      const result = await db.query(
        `SELECT * FROM public.spec_full(4, $1, $2, $3, $4) ORDER BY out_spec_id`,
        [language, search, limit, offset]
      );

      const totalResult = await db.query(
        `SELECT COUNT(*) AS total FROM public.spec
         WHERE spec_kod ILIKE '%' || $1 || '%'
            OR spec_kz ILIKE '%' || $1 || '%'
            OR spec_ru ILIKE '%' || $1 || '%'
            OR spec_en ILIKE '%' || $1 || '%'`,
        [search]
      );

      const totalCount = parseInt(totalResult.rows[0].total, 10);

      return res.json({
        ok: true,
        data: result.rows,
        totalCount
      });
    } catch (error) {
      console.error('Ошибка при получении списка специальностей:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера при получении специальностей' });
    }
  }
}

module.exports = SpecialtiesController;
