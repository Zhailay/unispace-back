const StudentProcedures = require('../models/StudentProcedures');
const SotrudnikProcedures = require('../models/SotrudnikProcedures');

class DashboardController {
  static async index(req, res) {
    try {
      if (req.session.userType === 'student') {
        return await DashboardController.studentDashboard(req, res);
      } else if (req.session.userType === 'sotrudnik') {
        return await DashboardController.staffDashboard(req, res);
      }

      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async studentDashboard(req, res) {
    const student = await StudentProcedures.findById(req.session.userId);

    res.json({
      ok: true,
      data: {
        today: new Date(),
        courses: [],
        grades: [],
        assignments: [],
        attendance: 0
      }
    });
  }

  static async staffDashboard(req, res) {
    const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);

    res.json({
      ok: true,
      data: {
        today: new Date(),
        courses: [],
        stats: {
          courses: 0,
          students: 0,
          assignments: 0,
          grades: 0
        },
        pendingSubmissions: [],
        recentActivity: []
      }
    });
  }
}

module.exports = DashboardController;
