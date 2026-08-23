const express = require('express');
const router = express.Router();
const KalendarController = require('../controllers/ucheb/kalendarController');

// Middleware для проверки авторизации сотрудника
const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

// Применяем middleware ко всем маршрутам
router.use(requireStaffAuth);

// Маршруты для kalendar
router.get('/', KalendarController.staffKalendar);
router.post('/insert', KalendarController.insertKalendar);
router.post('/tb', KalendarController.selectKalendar);
router.put('/', KalendarController.updateKalendar);
router.delete('/', KalendarController.deleteKalendar);

module.exports = router;
