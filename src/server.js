const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/database');
const { i18nMiddleware } = require('./middlewares/i18n');
const { loadCurrentUser } = require('./middlewares/auth');
// Импорт маршрутов
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const langRoutes = require('./routes/lang');
const studentRoutes = require('./routes/student');
const staffRoutes = require('./routes/staff');
const kadrRoutes = require('./routes/kadr');
const specialitiesRoutes = require('./routes/specialities');
const gruppaOpRoutes = require('./routes/gruppa_op');
const gruppaRoutes = require('./routes/gruppa');
const studentsRoutes = require('./routes/students');
const kalendarRoutes = require('./routes/kalendar');
const disciplinaRoutes = require('./routes/disciplina');
const modulNameRoutes = require('./routes/modul_name');
const obshNameRoutes = require('./routes/obsh_name');
const planRoutes = require('./routes/plan');
const registraciyaRoutes = require('./routes/registraciya');
const jurnalRoutes = require('./routes/jurnal');
const vneplanovoeRoutes = require('./routes/vneplanovoe');
const testUploadRoutes = require('./routes/test_upload');

const app = express();
const PORT = process.env.PORT || 4005;

// За nginx/IIS — чтобы secure-cookie и req.protocol работали корректно.
app.set('trust proxy', 1);

// API отдаёт только JSON, поэтому CSP и прочая защита разметки не нужны.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(compression());

// CORS: фронт живёт на другом origin и шлёт cookie сессии.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Без Origin — curl, Postman, health-check самого сервера.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} не разрешён`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Сессии в PostgreSQL (таблица session должна существовать).
const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE, 10) || 30 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
  store: new pgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    // Кросс-доменный фронт в проде требует SameSite=None, а он работает только с Secure.
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  },
}));

app.use(i18nMiddleware);
app.use(loadCurrentUser);

// Flash-сообщения: контроллеры вызывают req.flash(), фронт получает их в поле flash.
app.use((req, res, next) => {
  req.flash = (type, message) => {
    if (type === 'success') req.session.flashSuccess = message;
    else if (type === 'error') req.session.flashError = message;
  };

  res.locals.flashSuccess = req.session.flashSuccess;
  res.locals.flashError = req.session.flashError;
  delete req.session.flashSuccess;
  delete req.session.flashError;
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'unispace-back', env: process.env.NODE_ENV || 'development' });
});

// Все маршруты под /api — фронт ходит только сюда.
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/lang', langRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/kadr', kadrRoutes);
app.use('/api/specialties', specialitiesRoutes);
app.use('/api/gruppa_op', gruppaOpRoutes);
app.use('/api/gruppa', gruppaRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/kalendar', kalendarRoutes);
app.use('/api/disciplina', disciplinaRoutes);
app.use('/api/modul_name', modulNameRoutes);
app.use('/api/obsh_name', obshNameRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/registraciya', registraciyaRoutes);
app.use('/api/jurnal', jurnalRoutes);
app.use('/api/vneplanovoe', vneplanovoeRoutes);
app.use('/api/test-upload', testUploadRoutes);

// Статика фронта: в проде бэк раздаёт собранный SPA.
// STATIC_DIR задаёт путь к dist/, по умолчанию ../unispace-front/dist.
const staticDir = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : path.resolve(__dirname, '../../unispace-front/dist');

if (fs.existsSync(staticDir)) {
  // Статические файлы (js, css, images) с длинным кешем.
  app.use(express.static(staticDir, {
    maxAge: isProduction ? '1y' : 0,
    etag: true,
    index: false, // index.html отдаём через SPA-fallback, не здесь.
  }));

  // SPA fallback: все не-/api пути возвращают index.html.
  app.get('*', (req, res, next) => {
    // Пропускаем /api — они уйдут в 404 ниже.
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(staticDir, 'index.html'));
  });

  console.log(`Serving SPA from ${staticDir}`);
} else if (isProduction) {
  console.warn(`STATIC_DIR not found at ${staticDir} — SPA won't be served`);
}

// 404 для API (или если статика не найдена)
app.use((req, res) => {
  res.status(404).json({ ok: false, error: `Not found: ${req.method} ${req.originalUrl}` });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    ok: false,
    error: err.message || 'Internal server error',
    // Стек только в разработке — в проде наружу не отдаём.
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

const server = app.listen(PORT, () => {
  console.log(`API is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS origins: ${allowedOrigins.join(', ')}`);
});

function shutdown(signal) {
  console.log(`${signal} received: closing HTTP server`);
  server.close(() => {
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
