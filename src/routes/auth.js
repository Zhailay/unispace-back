const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// POST /api/auth/login       — вход, тип (student | sotrudnik) бэк определяет сам
router.post('/login', AuthController.login);

// POST /api/auth/choose-role — завершает вход, если логин совпал с обеими таблицами
router.post('/choose-role', AuthController.chooseRole);

// POST /api/auth/switch-role — переключение роли без пароля (если есть обе)
router.post('/switch-role', AuthController.switchRole);

// GET  /api/auth/me          — текущий пользователь по cookie сессии
router.get('/me', AuthController.me);

// POST /api/auth/logout — выход
router.post('/logout', AuthController.logout);

module.exports = router;
