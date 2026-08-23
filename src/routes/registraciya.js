const express = require('express');
const router = express.Router();
const RegistraciyaController = require('../controllers/ucheb/registraciyaController');

const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

router.use(requireStaffAuth);

router.get('/', RegistraciyaController.staffRegistraciya);
router.post('/disciplina', RegistraciyaController.getDisciplinaList);
router.post('/gruppa', RegistraciyaController.getGruppaBySpec);
router.post('/vid_zanyatiya', RegistraciyaController.getVidZanyatiyaList);
router.post('/students', RegistraciyaController.getStudentList);
router.post('/save', RegistraciyaController.saveRegistraciya);
router.post('/table', RegistraciyaController.getRegistraciyaTable);
router.post('/delete', RegistraciyaController.deleteRegistraciya);

module.exports = router;
