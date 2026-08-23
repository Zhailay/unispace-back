const StudentProcedures = require('../models/StudentProcedures');
const SotrudnikProcedures = require('../models/SotrudnikProcedures');

/**
 * Аутентификация для SPA. В отличие от остальных контроллеров здесь нет
 * res.render/res.redirect — фронту нужен явный JSON-контракт.
 *
 * Два независимых потока входа: студенты (student/student_password) и
 * сотрудники (sotrudnik/sotrudnik_password). Логин — числовой (ИИН).
 */
class AuthController {
  // POST /api/auth/login  { login, password, userType }
  static async login(req, res) {
    // email — историческое имя поля из старой hbs-формы, принимаем оба.
    const login = req.body.login ?? req.body.email;
    const { password, userType } = req.body;

    if (!login || !password) {
      return res.status(400).json({ ok: false, error: req.t('auth.login_failed') });
    }

    if (userType !== 'student' && userType !== 'sotrudnik') {
      return res.status(400).json({ ok: false, error: 'userType должен быть student или sotrudnik' });
    }

    try {
      const user = userType === 'student'
        ? await StudentProcedures.verifyPassword(login, password)
        : await SotrudnikProcedures.verifyPassword(login, password);

      if (!user) {
        return res.status(401).json({ ok: false, error: req.t('auth.login_failed') });
      }

      // Защита от session fixation: старый идентификатор сессии не переиспользуем.
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regenerate error:', err);
          return res.status(500).json({ ok: false, error: req.t('error.internal_server') });
        }

        req.session.userId = user.id;
        req.session.userType = userType;

        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.status(500).json({ ok: false, error: req.t('error.internal_server') });
          }
          res.json({ ok: true, user });
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  // GET /api/auth/me — фронт вызывает при старте, чтобы восстановить сессию
  static async me(req, res) {
    if (!req.session?.userId) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }

    // loadCurrentUser уже сходил в БД и положил пользователя в res.locals.
    const user = res.locals.currentUser;
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }

    res.json({ ok: true, user });
  }

  // POST /api/auth/logout
  static logout(req, res) {
    if (!req.session) return res.json({ ok: true });

    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ ok: false, error: req.t('error.internal_server') });
      }
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  }
}

module.exports = AuthController;
