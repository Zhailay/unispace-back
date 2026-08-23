const express = require('express');
const router = express.Router();
const VneplanovoeController = require('../controllers/ucheb/vneplanovoeController');

const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

router.use(requireStaffAuth);

router.get('/', VneplanovoeController.index);
router.post('/list', VneplanovoeController.getList);
router.post('/exam-list', VneplanovoeController.getExamList);
router.post('/nedelya-spisok', VneplanovoeController.getNedelyaSpisok);
router.post('/vid-zanyatiya', VneplanovoeController.getVidZanyatiya);
router.post('/students', VneplanovoeController.getStudents);
router.post('/save', VneplanovoeController.saveSpravka);
router.post('/delete-spravka', VneplanovoeController.deleteSpravka);
router.post('/exam-students-vn', VneplanovoeController.getExamVnStudents);
router.post('/save-exam', VneplanovoeController.saveExamSpravka);

module.exports = router;
