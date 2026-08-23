const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');

// Middleware для проверки авторизации студента — JSON-ответ при отсутствии сессии
const requireStudentAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'student') {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }
  next();
};

// Применяем middleware ко всем маршрутам
router.use(requireStudentAuth);

// Профиль студента
router.get('/profile', ProfileController.studentProfile);
router.post('/profile/change-password', ProfileController.studentChangePassword);

module.exports = router;
