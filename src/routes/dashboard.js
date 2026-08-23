const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middlewares/auth');

// GET /dashboard - Главная панель
router.get('/', requireAuth, DashboardController.index);

module.exports = router;
