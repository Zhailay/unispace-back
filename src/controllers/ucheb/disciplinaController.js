const SotrudnikProcedures = require('../../models/SotrudnikProcedures');
const db = require('../../config/database');

class DisciplinaController {

  static async staffDisciplina(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      const yazyk_id = req.session.lang;
      const podrazdelenie_list = await SotrudnikProcedures.getPodrazdelenieList(yazyk_id);

      res.json({
        ok: true,
        data: { podrazdelenie_list }
      });
    } catch (error) {
      console.error('Staff disciplina error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async insertDisciplina(req, res) {
    try {
      const {
        disciplina_kz, disciplina_ru, disciplina_en,
        disciplina_kredit, disciplina_lk, disciplina_pz,
        disciplina_lz, disciplina_srs, disciplina_srsp,
        disciplina_pp, disciplina_lpz, disciplina_fz,
        disciplina_opisanie, id_podrazdelenie
      } = req.body;

      if (!disciplina_kz || !disciplina_ru || !disciplina_en) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      const result = await db.query(
        `SELECT * FROM public.disciplina_full(
          $1::integer, $2::varchar, $3::varchar, $4::integer, $5::integer,
          $6::bigint, $7::varchar, $8::varchar, $9::varchar,
          $10::smallint, $11::smallint, $12::smallint, $13::smallint,
          $14::smallint, $15::smallint, $16::smallint,
          $17::smallint, $18::smallint,
          $19::varchar, $20::bigint
        )`,
        [
          1, null, null, null, null, null,
          disciplina_kz, disciplina_ru, disciplina_en,
          disciplina_kredit, disciplina_lk || 0, disciplina_pz || 0,
          disciplina_lz || 0, disciplina_srs || 0, disciplina_srsp || 0,
          disciplina_pp || 0, disciplina_lpz || 0, disciplina_fz || 0,
          disciplina_opisanie || '', id_podrazdelenie || null
        ]
      );

      const row = result.rows[0];

      if (row && row.out_code === 1) {
        return res.json({ ok: true });
      } else if (row && row.out_code === 2) {
        return res.json({ ok: false, error: 'Такая дисциплина уже существует' });
      } else if (row && row.out_code === 3) {
        return res.json({ ok: false, error: 'Все часы равны 0' });
      } else {
        return res.json({ ok: false, error: 'Неизвестная ошибка' });
      }
    } catch (error) {
      console.error('Ошибка при добавлении дисциплины:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async updateDisciplina(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Не авторизован' });
      }

      const {
        disciplina_id, disciplina_kz, disciplina_ru, disciplina_en,
        disciplina_kredit, disciplina_lk, disciplina_pz,
        disciplina_lz, disciplina_srs, disciplina_srsp,
        disciplina_pp, disciplina_lpz, disciplina_fz,
        disciplina_opisanie, id_podrazdelenie
      } = req.body;

      if (!disciplina_id || !disciplina_kz || !disciplina_ru || !disciplina_en) {
        return res.json({ ok: false, error: 'Заполните все обязательные поля' });
      }

      await db.query(
        `SELECT 1 FROM public.disciplina_full(
          $1::integer, $2::varchar, $3::varchar, $4::integer, $5::integer,
          $6::bigint, $7::varchar, $8::varchar, $9::varchar,
          $10::smallint, $11::smallint, $12::smallint, $13::smallint,
          $14::smallint, $15::smallint, $16::smallint,
          $17::smallint, $18::smallint,
          $19::varchar, $20::bigint
        )`,
        [
          2, null, null, null, null, disciplina_id,
          disciplina_kz, disciplina_ru, disciplina_en,
          disciplina_kredit || 0, disciplina_lk || 0, disciplina_pz || 0,
          disciplina_lz || 0, disciplina_srs || 0, disciplina_srsp || 0,
          disciplina_pp || 0, disciplina_lpz || 0, disciplina_fz || 0,
          disciplina_opisanie || null, id_podrazdelenie || null
        ]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при обновлении дисциплины:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async deleteDisciplina(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Не авторизован' });
      }

      const { disciplina_id } = req.body;

      if (!disciplina_id) {
        return res.json({ ok: false, error: 'Не указан идентификатор' });
      }

      await db.query(
        `SELECT 1 FROM public.disciplina_full(3::integer, NULL::varchar, NULL::varchar, NULL::integer, NULL::integer, $1::bigint)`,
        [disciplina_id]
      );

      return res.json({ ok: true });
    } catch (error) {
      console.error('Ошибка при удалении дисциплины:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }

  static async selectDisciplina(req, res) {
    try {
      const search = req.body.search || '';
      const limit = parseInt(req.body.limit, 10) || 20;
      const offset = parseInt(req.body.offset, 10) || 0;
      const language = req.session.lang || 'ru';
      const id_podrazdelenie = req.body.id_podrazdelenie || null;

      const result = await db.query(
        `SELECT * FROM public.disciplina_full(
          4::integer, $1::varchar, $2::varchar, $3::integer, $4::integer,
          NULL::bigint, NULL::varchar, NULL::varchar, NULL::varchar,
          NULL::smallint, NULL::smallint, NULL::smallint, NULL::smallint,
          NULL::smallint, NULL::smallint, NULL::smallint,
          NULL::smallint, NULL::smallint,
          NULL::varchar, $5::bigint
        )
        ORDER BY out_disciplina_id`,
        [language, search || null, limit, offset, id_podrazdelenie]
      );

      const totalResult = await db.query(
        `SELECT COUNT(*) AS total FROM public.disciplina
         WHERE
           ($2::bigint IS NULL OR id_podrazdelenie = $2::bigint)
           AND (
             $1 = '' OR
             disciplina_kz ILIKE '%' || $1 || '%' OR
             disciplina_ru ILIKE '%' || $1 || '%' OR
             disciplina_en ILIKE '%' || $1 || '%'
           )`,
        [search, id_podrazdelenie]
      );

      const totalCount = parseInt(totalResult.rows[0].total, 10);

      return res.json({
        ok: true,
        data: result.rows,
        totalCount
      });
    } catch (error) {
      console.error('Ошибка при получении списка дисциплин:', error);
      return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }
}

module.exports = DisciplinaController;
