const express = require('express');
const router = express.Router();
const JurnalController = require('../controllers/ucheb/jurnalController');

const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

router.use(requireStaffAuth);

router.get('/', JurnalController.staffJurnal);
router.post('/tk', JurnalController.getTkList);
router.post('/praktika', JurnalController.getPraktikaList);
router.post('/itog', JurnalController.getItogList);
router.post('/students', JurnalController.getStudentList);
router.post('/exam-students', JurnalController.getExamStudentList);
router.post('/kalendar-itog', JurnalController.getKalendarItog);
router.post('/nedelya', JurnalController.getNedelya);
router.post('/nedelya-dostupnye', JurnalController.getNedelyaDostupnye);
router.post('/save', JurnalController.saveGrades);
router.post('/week-detail', JurnalController.getWeekDetail);
router.post('/r1-students', JurnalController.getR1StudentList);
router.post('/r2-students', JurnalController.getR2StudentList);

module.exports = router;
