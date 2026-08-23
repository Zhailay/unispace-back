const SotrudnikProcedures = require('../../models/SotrudnikProcedures');
const db = require('../../config/database');

class GruppaController {

  static async staffGruppa(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      const yazyk_id = req.session.lang;

      const [otdelenie_list, spec_list, forma_obuch_list, god_list] = await Promise.all([
        SotrudnikProcedures.getOtdelenieList(yazyk_id),
        SotrudnikProcedures.getSpecList(yazyk_id),
        SotrudnikProcedures.getFormaObuchList(yazyk_id),
        SotrudnikProcedures.getGodList()
      ]);

      res.json({
        ok: true,
        data: {
          otdelenie_list,
          spec_list,
          forma_obuch_list,
          god_list
        }
      });
    } catch (error) {
      console.error('Staff gruppa error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async insertGruppa(req, res) {
    try {
      const { gruppa_name, id_otdelenie, id_spec, id_forma_obuch, id_god } = req.body;

      if (!gruppa_name || !id_otdelenie || !id_spec || !id_forma_obuch || !id_god) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      const result = await db.query(
        `SELECT * FROM public.gruppa_full($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [1, null, null, null, null, null, gruppa_name, id_otdelenie, id_spec, id_forma_obuch, id_god]
      );

      const row = result.rows[0];

      if (row.out_code === 1) {
        return res.json({ ok: true });
      } else if (row.out_code === 2) {
        return res.json({ ok: false, error: 'Такая группа уже существует' });
      } else if (row.out_code === 3) {
        return res.json({ ok: false, error: 'Форма обучения не найдена' });
      } else {
        return res.json({ ok: false, error: 'Неизвестная ошибка' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: 'Ошибка при добавлении группы' });
    }
  }

  static async deleteGruppa(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Не авторизован' });
      }

      const { gruppa_id } = req.body;

      if (!gruppa_id) {
        return res.json({ ok: false, error: 'Не указан идентификатор группы' });
      }

      await db.query(
        `SELECT 1 FROM public.gruppa_full(3, NULL, NULL, NULL, NULL, $1)`,
        [gruppa_id]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при удалении группы:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера при удалении' });
    }
  }

  static async updateGruppa(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Не авторизован' });
      }

      const { gruppa_id, gruppa_name, id_otdelenie, id_spec, id_forma_obuch, id_god } = req.body;

      if (!gruppa_id || !gruppa_name || !id_otdelenie || !id_spec || !id_forma_obuch || !id_god) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      await db.query(`
        SELECT 1 FROM public.gruppa_full($1, NULL, NULL, NULL, NULL, $2, $3, $4, $5, $6, $7)`,
        [2, gruppa_id, gruppa_name, id_otdelenie, id_spec, id_forma_obuch, id_god]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при обновлении группы:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера при обновлении' });
    }
  }

  static async selectGruppa(req, res) {
    try {
      const search = req.body.search || '';
      const limit = parseInt(req.body.limit, 10) || 20;
      const offset = parseInt(req.body.offset, 10) || 0;
      const language = req.session.lang || 'ru';

      const result = await db.query(
        `SELECT * FROM public.gruppa_full(4, $1, $2, $3, $4) ORDER BY out_gruppa_id`,
        [language, search, limit, offset]
      );

      const totalResult = await db.query(
        `SELECT COUNT(*) AS total FROM public.gruppa WHERE gruppa_name ILIKE '%' || $1 || '%'`,
        [search]
      );

      const totalCount = parseInt(totalResult.rows[0].total, 10);

      return res.json({
        ok: true,
        data: result.rows,
        totalCount
      });
    } catch (error) {
      console.error('Ошибка при получении списка групп:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера при получении групп' });
    }
  }
}

module.exports = GruppaController;
