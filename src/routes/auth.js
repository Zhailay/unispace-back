const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// POST /api/auth/login  — вход (student | sotrudnik)
router.post('/login', AuthController.login);

// GET  /api/auth/me     — текущий пользователь по cookie сессии
router.get('/me', AuthController.me);

// POST /api/auth/logout — выход
router.post('/logout', AuthController.logout);

module.exports = router;
