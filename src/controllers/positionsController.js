const SotrudnikProcedures = require('../models/SotrudnikProcedures');
const PositionsProcedures = require('../models/PositionsProcedures');

class PositionsController {

  static async staffPositions(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      const search = req.query.search || null;
      const [positions, vidPersonalList] = await Promise.all([
        PositionsProcedures.getAll(search),
        PositionsProcedures.getVidPersonalList()
      ]);

      const vidMap = {};
      vidPersonalList.forEach(v => { vidMap[v.id] = v.ru; });
      positions.forEach(p => {
        p.vidPersonalName = vidMap[p.vidPersonalId] || '';
      });

      res.json({
        ok: true,
        data: {
          positions,
          vidPersonalList,
          meta: { total: positions.length },
          search
        }
      });
    } catch (error) {
      console.error('Staff positions error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async createPosition(req, res) {
    try {
      const { name_kz, name_ru, name_en, staff_type_id } = req.body;

      const result = await PositionsProcedures.create({
        kz: name_kz,
        ru: name_ru,
        en: name_en,
        vidPersonalId: staff_type_id ? parseInt(staff_type_id) : null
      });

      if (result && result.code === 2) {
        return res.json({ ok: false, error: 'Такая должность уже существует' });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error('Create position error:', error);
      res.status(500).json({ ok: false, error: 'Ошибка при создании должности' });
    }
  }

  static async updatePosition(req, res) {
    try {
      const id = parseInt(req.params.id);
      const { name_kz, name_ru, name_en, staff_type_id } = req.body;

      await PositionsProcedures.update(id, {
        kz: name_kz,
        ru: name_ru,
        en: name_en,
        vidPersonalId: staff_type_id ? parseInt(staff_type_id) : null
      });

      return res.json({ ok: true });
    } catch (error) {
      console.error('Update position error:', error);
      res.status(500).json({ ok: false, error: 'Ошибка при обновлении должности' });
    }
  }

  static async deletePosition(req, res) {
    try {
      const id = parseInt(req.params.id);
      await PositionsProcedures.delete(id);
      return res.json({ ok: true });
    } catch (error) {
      console.error('Delete position error:', error);
      res.status(500).json({ ok: false, error: 'Ошибка при удалении должности' });
    }
  }
}

module.exports = PositionsController;
