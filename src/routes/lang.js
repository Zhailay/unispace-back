const express = require('express');
const router = express.Router();
const { changeLanguage, getTranslations } = require('../middlewares/i18n');

// GET  /api/lang/translations?lang=ru — словарь переводов для фронта
router.get('/translations', getTranslations);

// POST /api/lang { lang: 'kk' } — запомнить выбор языка в сессии
router.post('/', changeLanguage);

module.exports = router;
