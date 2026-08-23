const SotrudnikProcedures = require('../../models/SotrudnikProcedures');
const db = require('../../config/database');

class VneplanovoeController {

  static async index(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) return res.status(401).json({ ok: false, error: 'Not authenticated' });

      const yazyk_id = req.session.lang || 'ru';

      const [semestrResult, denResult] = await Promise.all([
        db.query(`SELECT semestr_id, semestr_nomer FROM public.semestr ORDER BY semestr_nomer`),
        db.query(`SELECT * FROM public.den_spisok($1)`, [yazyk_id])
      ]);

      res.json({ ok: true, data: { semestr_list: semestrResult.rows, den_list: denResult.rows } });
    } catch (error) {
      console.error('Vneplanovoe index error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async getList(req, res) {
    try {
      const { id_semestr } = req.body;
      if (!id_semestr) return res.json([]);

      const yazyk = req.session.lang || 'ru';
      const result = await db.query(
        `SELECT * FROM public.jurnal_gruppa_spisok_vneplan_teoret($1::bigint, $2::varchar)`,
        [id_semestr, yazyk]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Vneplanovoe getList error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getNedelyaSpisok(req, res) {
    try {
      const { kalendar_id } = req.body;
      if (!kalendar_id) return res.json([]);

      const result = await db.query(
        `SELECT * FROM public.jurnal_nedelya_spisok($1::bigint)`,
        [kalendar_id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Vneplanovoe getNedelyaSpisok error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getVidZanyatiya(req, res) {
    try {
      const { plan_id } = req.body;
      if (!plan_id) return res.json([]);

      const yazyk = req.session.lang || 'ru';
      const result = await db.query(
        `SELECT * FROM public.vid_zanyatiya_spisok_vneplan_teoret($1::bigint, $2::varchar)`,
        [plan_id, yazyk]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Vneplanovoe getVidZanyatiya error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getStudents(req, res) {
    try {
      const { gruppa_id, plan_sotrudnik_id, id_nedelya, id_den } = req.body;
      if (!gruppa_id || !plan_sotrudnik_id) return res.json([]);

      const result = await db.query(
        `SELECT * FROM public.jurnal_student_spisok_vneplan_teoret($1::bigint, $2::bigint, $3::int, $4::smallint)`,
        [gruppa_id, plan_sotrudnik_id, id_nedelya || null, id_den || null]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Vneplanovoe getStudents error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async saveSpravka(req, res) {
    try {
      const { plan_student_ids, id_nedelya, id_den, nachalo_list, konec_list } = req.body;
      if (!plan_student_ids || !plan_student_ids.length || !id_nedelya || !id_den) return res.json({ ok: false });

      await db.query(
        `SELECT public.spravka_jurnal_save($1::bigint[], $2::int, $3::smallint, $4::text[], $5::text[])`,
        [plan_student_ids, id_nedelya, id_den, nachalo_list, konec_list]
      );
      res.json({ ok: true });
    } catch (error) {
      console.error('Vneplanovoe saveSpravka error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async deleteSpravka(req, res) {
    try {
      const { plan_student_ids, id_nedelya, id_den } = req.body;
      if (!plan_student_ids || !plan_student_ids.length || !id_nedelya || !id_den) return res.json({ ok: false });

      await db.query(
        `SELECT public.spravka_jurnal_delete($1::bigint[], $2::int, $3::smallint)`,
        [plan_student_ids, id_nedelya, id_den]
      );
      res.json({ ok: true });
    } catch (error) {
      console.error('Vneplanovoe deleteSpravka error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getExamList(req, res) {
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
      console.error('Vneplanovoe getExamList error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getExamVnStudents(req, res) {
    try {
      const { gruppa_id, plan_id } = req.body;
      const id_sotrudnik = req.session.userId;
      if (!gruppa_id || !plan_id) return res.json([]);

      const result = await db.query(
        `SELECT * FROM public.jurnal_student_spisok_vneplan_ekzamen($1::bigint, $2::bigint, $3::bigint)`,
        [gruppa_id, plan_id, id_sotrudnik]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Vneplanovoe getExamVnStudents error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async saveExamSpravka(req, res) {
    try {
      const { plan_student_ids, nachalo_list, konec_list } = req.body;
      if (!plan_student_ids || !plan_student_ids.length) return res.json({ ok: false });

      await db.query(
        `SELECT public.spravka_jurnal_save_ekzamen($1::bigint[], $2::text[], $3::text[])`,
        [plan_student_ids, nachalo_list, konec_list]
      );
      res.json({ ok: true });
    } catch (error) {
      console.error('Vneplanovoe saveExamSpravka error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

}

module.exports = VneplanovoeController;
