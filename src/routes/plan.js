const express = require('express');
const router = express.Router();
const PlanController = require('../controllers/ucheb/planController');

const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

router.use(requireStaffAuth);

router.get('/', PlanController.staffPlan);
router.post('/insert', PlanController.insertPlan);
router.post('/tb', PlanController.selectPlan);
router.post('/period_obuch', PlanController.selectPeriodObuch);
router.post('/poisk_dis', PlanController.selectPoiskDisciplina);
router.put('/', PlanController.updatePlan);
router.delete('/', PlanController.deletePlan);

module.exports = router;
