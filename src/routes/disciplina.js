const express = require('express');
const router = express.Router();
const DisciplinaController = require('../controllers/ucheb/disciplinaController');

const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

router.use(requireStaffAuth);

router.get('/', DisciplinaController.staffDisciplina);
router.post('/insert', DisciplinaController.insertDisciplina);
router.post('/tb', DisciplinaController.selectDisciplina);
router.put('/', DisciplinaController.updateDisciplina);
router.delete('/', DisciplinaController.deleteDisciplina);

module.exports = router;
