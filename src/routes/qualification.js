const express = require('express');
const router = express.Router();
const QualificationController = require('../controllers/ucheb/qualificationController');

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

router.get('/', QualificationController.staffQualification);

module.exports = router;
