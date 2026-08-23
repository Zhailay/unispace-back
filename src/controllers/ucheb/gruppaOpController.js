const SotrudnikProcedures = require('../../models/SotrudnikProcedures');
const db = require('../../config/database');

class GruppaOpController {

  static async staffGruppaOp(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      res.json({ ok: true, data: {} });
    } catch (error) {
      console.error('Staff gruppa_op error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async insertGruppaOp(req, res) {
    try {
      const { gruppa_op_kod, gruppa_op_kz, gruppa_op_ru, gruppa_op_en } = req.body;

      if (!gruppa_op_kod || !gruppa_op_kz || !gruppa_op_ru || !gruppa_op_en) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      const result = await db.query(
        `SELECT * FROM public.gruppa_op_full2($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [1, null, null, null, null, gruppa_op_kod, gruppa_op_kz, gruppa_op_ru, gruppa_op_en]
      );

      const row = result.rows[0];

      if (row.out_code === 1) {
        return res.json({ ok: true });
      } else if (row.out_code === 2) {
        return res.json({ ok: false, error: 'Такая группа ОП уже существует' });
      } else {
        return res.json({ ok: false, error: 'Неизвестная ошибка' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: 'Ошибка при добавлении группы ОП' });
    }
  }

  static async deleteGruppaOp(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Не авторизован' });
      }

      const { gruppa_op_id } = req.body;

      if (!gruppa_op_id) {
        return res.json({ ok: false, error: 'Не указан идентификатор группы ОП' });
      }

      await db.query(
        `SELECT 1 FROM public.gruppa_op_full2(3, NULL, NULL, NULL, $1)`,
        [gruppa_op_id]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при удалении группы ОП:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера при удалении' });
    }
  }

  static async updateGruppaOp(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Не авторизован' });
      }

      const { gruppa_op_id, gruppa_op_kod, gruppa_op_kz, gruppa_op_ru, gruppa_op_en } = req.body;

      if (!gruppa_op_id || !gruppa_op_kod || !gruppa_op_kz || !gruppa_op_ru || !gruppa_op_en) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      await db.query(`
        SELECT 1 FROM public.gruppa_op_full2($1, NULL, NULL, NULL, $2, $3, $4, $5, $6)`,
        [2, gruppa_op_id, gruppa_op_kod, gruppa_op_kz, gruppa_op_ru, gruppa_op_en]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при обновлении группы ОП:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера при обновлении' });
    }
  }

  static async selectGruppaOp(req, res) {
    try {
      const search = req.body.search || '';
      const limit = parseInt(req.body.limit, 10) || 20;
      const offset = parseInt(req.body.offset, 10) || 0;

      const result = await db.query(
        `SELECT * FROM public.gruppa_op_full2(4, $1, $2, $3) ORDER BY out_gruppa_op_id`,
        [search, limit, offset]
      );

      const totalResult = await db.query(
        `SELECT COUNT(*) AS total FROM public.gruppa_op
         WHERE gruppa_op_kod ILIKE '%' || $1 || '%'
            OR gruppa_op_kz ILIKE '%' || $1 || '%'
            OR gruppa_op_ru ILIKE '%' || $1 || '%'
            OR gruppa_op_en ILIKE '%' || $1 || '%'`,
        [search]
      );

      const totalCount = parseInt(totalResult.rows[0].total, 10);

      return res.json({
        ok: true,
        data: result.rows,
        totalCount
      });
    } catch (error) {
      console.error('Ошибка при получении списка групп ОП:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера при получении групп ОП' });
    }
  }
}

module.exports = GruppaOpController;
