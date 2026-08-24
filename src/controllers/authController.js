const StudentProcedures = require('../models/StudentProcedures');
const SotrudnikProcedures = require('../models/SotrudnikProcedures');

/**
 * Аутентификация для SPA. В отличие от остальных контроллеров здесь нет
 * res.render/res.redirect — фронту нужен явный JSON-контракт.
 *
 * Два независимых потока входа: студенты (student/student_password) и
 * сотрудники (sotrudnik/sotrudnik_password). Логин — числовой (ИИН).
 * userType фронт не присылает — какой это тип входа, определяется тем,
 * в какой из двух таблиц находится совпадение по логину/паролю (как в
 * дореформенном hbs-приложении). Если совпало и там и там — просим
 * выбрать роль явно (см. chooseRole), а не логиним наугад.
 */
class AuthController {
  // POST /api/auth/login  { login, password }
  static async login(req, res) {
    // email — историческое имя поля из старой hbs-формы, принимаем оба.
    const login = req.body.login ?? req.body.email;
    const { password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ ok: false, error: req.t('auth.login_failed') });
    }

    try {
      const [studentResult, sotrudnikResult] = await Promise.allSettled([
        StudentProcedures.verifyPassword(login, password),
        SotrudnikProcedures.verifyPassword(login, password),
      ]);

      const student = studentResult.status === 'fulfilled' ? studentResult.value : null;
      const sotrudnik = sotrudnikResult.status === 'fulfilled' ? sotrudnikResult.value : null;

      if (!student && !sotrudnik) {
        return res.status(401).json({ ok: false, error: req.t('auth.login_failed') });
      }

      // Один и тот же логин/пароль совпал и со студентом, и с сотрудником —
      // окончательный вход откладываем до явного выбора роли.
      if (student && sotrudnik) {
        return req.session.regenerate((err) => {
          if (err) {
            console.error('Session regenerate error:', err);
            return res.status(500).json({ ok: false, error: req.t('error.internal_server') });
          }

          req.session.pendingStudentId = student.id;
          req.session.pendingSotrudnikId = sotrudnik.id;

          req.session.save((saveErr) => {
            if (saveErr) {
              console.error('Session save error:', saveErr);
              return res.status(500).json({ ok: false, error: req.t('error.internal_server') });
            }
            res.json({ ok: true, needsRoleChoice: true });
          });
        });
      }

      const user = student || sotrudnik;
      AuthController.completeLogin(req, res, user, user.type);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  // POST /api/auth/choose-role  { role }
  // Завершает вход, начатый login(), когда логин/пароль совпали и со
  // студентом, и с сотрудником одновременно.
  static async chooseRole(req, res) {
    const { role } = req.body;
    const { pendingStudentId, pendingSotrudnikId } = req.session;

    if (!pendingStudentId || !pendingSotrudnikId) {
      return res.status(400).json({ ok: false, error: 'Нет ожидающего выбора роли' });
    }
    if (role !== 'student' && role !== 'sotrudnik') {
      return res.status(400).json({ ok: false, error: 'role должен быть student или sotrudnik' });
    }

    try {
      const id = role === 'student' ? pendingStudentId : pendingSotrudnikId;
      const user = role === 'student'
        ? await StudentProcedures.findById(id)
        : await SotrudnikProcedures.findById(id);

      if (!user) {
        return res.status(500).json({ ok: false, error: req.t('error.internal_server') });
      }

      req.session.studentId = pendingStudentId;
      req.session.sotrudnikId = pendingSotrudnikId;
      req.session.hasMultipleRoles = true;
      delete req.session.pendingStudentId;
      delete req.session.pendingSotrudnikId;
      req.session.userId = id;
      req.session.userType = role;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          return res.status(500).json({ ok: false, error: req.t('error.internal_server') });
        }
        res.json({ ok: true, user: { ...user, hasMultipleRoles: true } });
      });
    } catch (error) {
      console.error('Choose role error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  // POST /api/auth/switch-role
  // Для аккаунтов, у которых один и тот же логин зарегистрирован и как
  // студент, и как сотрудник — переключение без повторного ввода пароля.
  static async switchRole(req, res) {
    if (!req.session?.userId || !req.session?.hasMultipleRoles) {
      return res.status(400).json({ ok: false, error: 'Переключение ролей недоступно' });
    }

    try {
      const nextType = req.session.userType === 'student' ? 'sotrudnik' : 'student';
      const nextId = nextType === 'student' ? req.session.studentId : req.session.sotrudnikId;

      const user = nextType === 'student'
        ? await StudentProcedures.findById(nextId)
        : await SotrudnikProcedures.findById(nextId);

      if (!user) {
        return res.status(500).json({ ok: false, error: req.t('error.internal_server') });
      }

      req.session.userId = nextId;
      req.session.userType = nextType;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          return res.status(500).json({ ok: false, error: req.t('error.internal_server') });
        }
        res.json({ ok: true, user: { ...user, hasMultipleRoles: true } });
      });
    } catch (error) {
      console.error('Switch role error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  // Защита от session fixation: старый идентификатор сессии не переиспользуем.
  static completeLogin(req, res, user, userType) {
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
        res.json({ ok: true, user: { ...user, hasMultipleRoles: false } });
      });
    });
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

    res.json({ ok: true, user: { ...user, hasMultipleRoles: !!req.session.hasMultipleRoles } });
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
