const express = require('express');
const router = express.Router();
const SpecialtiesController = require('../controllers/ucheb/specialtiesController');

// Middleware для проверки авторизации сотрудника
const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

// Применяем middleware ко всем маршрутам
router.use(requireStaffAuth);

// Профиль сотрудника

router.get('/', SpecialtiesController.staffSpecialties);
router.post('/insert', SpecialtiesController.insertSpecialties);
router.post('/tb', SpecialtiesController.selectSpecialties);
// router.post('/gruppa_op_spisok', SpecialtiesController.selectGruppaOpSpisok);
router.put('/', SpecialtiesController.updateSpecialties);
router.delete('/', SpecialtiesController.deleteSpecialties);

module.exports = router;
