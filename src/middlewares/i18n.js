const fs = require('fs');
const path = require('path');

// Кеш для переводов
const translations = {};

// Загрузка переводов из файлов
function loadTranslations() {
  const localesDir = path.join(__dirname, '../locales');
  const languages = process.env.SUPPORTED_LANGUAGES.split(',');

  languages.forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      translations[lang] = JSON.parse(content);
    } else {
      console.warn(`Translation file not found: ${filePath}`);
      translations[lang] = {};
    }
  });
}

// Функция для получения вложенного значения по ключу типа "error.access_denied"
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Middleware для установки языка
function i18nMiddleware(req, res, next) {
  // Для SPA источником истины является фронт: он шлёт заголовок X-Lang.
  // Сессия и cookie остаются запасным вариантом.
  let lang = req.get('X-Lang') ||
             req.query.lang ||
             req.session?.lang ||
             req.cookies.lang ||
             process.env.DEFAULT_LANGUAGE ||
             'ru';

  // Проверка, что язык поддерживается
  const supportedLanguages = process.env.SUPPORTED_LANGUAGES.split(',');
  if (!supportedLanguages.includes(lang)) {
    lang = process.env.DEFAULT_LANGUAGE || 'ru';
  }


  // Функция перевода
  const t = (key, replacements = {}) => {
    let translation = getNestedValue(translations[lang], key) || key;

    // Handlebars передает именованные параметры в options.hash
    // Проверяем, если replacements это Handlebars options объект
    let params = replacements;
    if (replacements && replacements.hash) {
      params = replacements.hash;
    }

    // Замена плейсхолдеров типа {{variable}}
    Object.keys(params).forEach(placeholder => {
      translation = translation.replace(
        new RegExp(`{{${placeholder}}}`, 'g'),
        params[placeholder] || ''
      );
    });

    return translation;
  };

  // Добавление функции перевода в req и res.locals
  req.t = t;
  req.lang = lang;
  res.locals.t = t;
  res.locals.lang = lang;
  res.locals.supportedLanguages = supportedLanguages;

  next();
}

// POST /api/lang — смена языка. Фронт хранит выбор у себя и шлёт X-Lang,
// но язык дублируется в сессию, чтобы он пережил перезагрузку вкладки.
function changeLanguage(req, res) {
  const newLang = req.body.lang || req.query.lang;
  const supportedLanguages = process.env.SUPPORTED_LANGUAGES.split(',');

  if (!newLang || !supportedLanguages.includes(newLang)) {
    return res.status(400).json({
      ok: false,
      error: `Язык должен быть одним из: ${supportedLanguages.join(', ')}`,
    });
  }

  if (!req.session) {
    return res.json({ ok: true, lang: newLang });
  }

  req.session.lang = newLang;
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ ok: false, error: 'Не удалось сохранить язык' });
    }
    res.json({ ok: true, lang: newLang });
  });
}

// GET /api/lang/translations — словарь для фронта (react-i18next грузит отсюда)
function getTranslations(req, res) {
  const supportedLanguages = process.env.SUPPORTED_LANGUAGES.split(',');
  const lang = req.query.lang || req.lang;

  if (!supportedLanguages.includes(lang)) {
    return res.status(400).json({ ok: false, error: `Неизвестный язык: ${lang}` });
  }

  res.json({ ok: true, lang, translations: translations[lang] || {} });
}

// Инициализация - загрузка всех переводов
loadTranslations();

module.exports = {
  i18nMiddleware,
  changeLanguage,
  getTranslations,
  loadTranslations
};
