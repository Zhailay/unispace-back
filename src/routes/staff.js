const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');

// Middleware для проверки авторизации сотрудника — JSON-ответ при отсутствии сессии
const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }
  next();
};

// Применяем middleware ко всем маршрутам
router.use(requireStaffAuth);

// Профиль сотрудника
router.get('/profile', ProfileController.staffProfile);
router.post('/profile/change-password', ProfileController.staffChangePassword);


module.exports = router;
