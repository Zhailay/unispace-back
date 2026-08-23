const SotrudnikProcedures = require('../../models/SotrudnikProcedures');
const db = require('../../config/database');

class JurnalController {

  static async getStudentList(req, res) {
    try {
      const { plan_id, gruppa_id, id_nedelya, id_den } = req.body;
      const id_sotrudnik = req.session.userId;
      if (!plan_id || !gruppa_id) return res.json([]);

      const result = await db.query(
        `SELECT * FROM public.jurnal_student_list($1::bigint, $2::bigint, $3::bigint, $4::int, $5::smallint)`,
        [id_sotrudnik, plan_id, gruppa_id, id_nedelya ?? null, id_den ?? null]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('getStudentList error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getTkList(req, res) {
    try {
      const { id_semestr } = req.body;
      const id_sotrudnik = req.session.userId;
      if (!id_semestr) return res.json([]);

      const result = await db.query(
        `SELECT * FROM public.jurnal_gruppa_spisok($1::bigint, $2::bigint)`,
        [id_sotrudnik, id_semestr]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('getTkList error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  

  static async getPraktikaList(req, res) {
    try {
      const { id_semestr } = req.body;
      const id_sotrudnik = req.session.userId;
      if (!id_semestr) return res.json([]);

      const result = await db.query(
        `SELECT * FROM public.jurnal_gruppa_spisok_praktika($1::bigint, $2::bigint)`,
        [id_sotrudnik, id_semestr]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('getTkList error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }


  static async getExamStudentList(req, res) {
    try {
      const { plan_id, gruppa_id, jurnal_type = 2, kalendar_id } = req.body;
      const id_sotrudnik = req.session.userId;
      if (!plan_id || !gruppa_id) return res.json([]);

      const result = await db.query(
        `SELECT * FROM public.jurnal_student_list_ekzamen($1::bigint, $2::bigint, $3::bigint, $4::smallint, $5::bigint)`,
        [id_sotrudnik, plan_id, gruppa_id, jurnal_type, kalendar_id ?? null]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('getExamStudentList error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getItogList(req, res) {
    try {
      const { id_semestr } = req.body;
      const id_sotrudnik = req.session.userId;
      if (!id_semestr) return res.json([]);

      const result = await db.query(
        `SELECT * FROM public.jurnal_gruppa_spisok_itog($1::bigint, $2::bigint)`,
        [id_sotrudnik, id_semestr]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('getTkList error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async saveGrades(req, res) {
    try {
      const { grades, jurnal_type = 1 } = req.body;
      if (!grades || !grades.length) return res.json({ ok: true });

      const toSave = grades
        .filter(g => (g.jurnal_ball !== null && g.jurnal_ball !== undefined) || g.jurnal_propusk)
        .map(g => ({ ...g, jurnal_ball: g.jurnal_ball ?? 0 }));
      if (!toSave.length) return res.json({ ok: true });

      await db.query(
        `SELECT public.jurnal_save($1::bigint[], $2::int[], $3::smallint[], $4::smallint[], $5::smallint[], $6::varchar[], $7::smallint)`,
        [
          toSave.map(g => g.id_plan_student),
          toSave.map(g => g.id_nedelya),
          toSave.map(g => g.jurnal_ball),
          toSave.map(g => g.id_den),
          toSave.map(g => g.jurnal_propusk ?? 0),
          toSave.map(g => g.jurnal_komment ?? null),
          jurnal_type
        ]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error('saveGrades error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getWeekDetail(req, res) {
    try {
      const { student_id, plan_id, week_num } = req.body;
      if (!student_id || !plan_id || !week_num) return res.json([]);
      const yazyk = req.session.lang || 'ru';

      const result = await db.query(
        `SELECT * FROM public.jurnal_week_detail($1::bigint, $2::bigint, $3::int, $4::varchar)`,
        [student_id, plan_id, week_num, yazyk]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('getWeekDetail error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getR2StudentList(req, res) {
    try {
      const { plan_id, gruppa_id } = req.body;
      const id_sotrudnik = req.session.userId;
      if (!plan_id || !gruppa_id) return res.json([]);

      const result = await db.query(
        `SELECT * FROM public.jurnal_students_r2($1::bigint, $2::bigint, $3::bigint)`,
        [id_sotrudnik, plan_id, gruppa_id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('getR2StudentList error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getR1StudentList(req, res) {
    try {
      const { plan_id, gruppa_id } = req.body;
      const id_sotrudnik = req.session.userId;
      if (!plan_id || !gruppa_id) return res.json([]);

      const result = await db.query(
        `SELECT * FROM public.jurnal_students_r1($1::bigint, $2::bigint, $3::bigint)`,
        [id_sotrudnik, plan_id, gruppa_id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('getR1StudentList error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getKalendarItog(req, res) {
    try {
      const { kalendar_id } = req.body;
      if (!kalendar_id) return res.json(null);

      const result = await db.query(
        `SELECT * FROM public.jurnal_kalendar_itog($1::bigint)`,
        [kalendar_id]
      );
      res.json(result.rows[0] || null);
    } catch (error) {
      console.error('getKalendarItog error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getNedelya(req, res) {
    try {
      const { kalendar_id } = req.body;
      if (!kalendar_id) return res.json(null);

      const result = await db.query(
        `SELECT * FROM public.jurnal_nedelya($1::bigint)`,
        [kalendar_id]
      );
      res.json(result.rows[0] || null);
    } catch (error) {
      console.error('getNedelya error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getNedelyaDostupnye(req, res) {
    try {
      const { kalendar_id, plan_id, gruppa_id } = req.body;
      if (!kalendar_id || !plan_id || !gruppa_id) return res.json([]);

      const result = await db.query(
        `SELECT * FROM public.jurnal_nedelya_dostupnye($1::bigint, $2::bigint, $3::bigint)`,
        [kalendar_id, plan_id, gruppa_id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('getNedelyaDostupnye error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async staffJurnal(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) return res.status(401).json({ ok: false, error: 'Not authenticated' });

      const yazyk_id = req.session.lang || 'ru';

      const [spec_list, god_list, forma_obuch_list, kurs_list, semestrResult, denResult] = await Promise.all([
        SotrudnikProcedures.getSpecList(yazyk_id),
        SotrudnikProcedures.getGodList(),
        SotrudnikProcedures.getFormaObuchList(yazyk_id),
        SotrudnikProcedures.getKursList(),
        db.query(`SELECT semestr_id, semestr_nomer FROM public.semestr ORDER BY semestr_nomer`),
        db.query(`SELECT * FROM public.den_spisok($1)`, [yazyk_id])
      ]);

      res.json({ ok: true, data: { spec_list, god_list, forma_obuch_list, kurs_list, semestr_list: semestrResult.rows, den_list: denResult.rows } });
    } catch (error) {
      console.error('Staff jurnal error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

}

module.exports = JurnalController;
