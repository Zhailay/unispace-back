const StudentProcedures = require('../models/StudentProcedures');
const SotrudnikProcedures = require('../models/SotrudnikProcedures');

class ProfileController {
  // Профиль студента — JSON
  static async studentProfile(req, res) {
    try {
      const student = await StudentProcedures.findById(req.session.userId);

      if (!student) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      res.json({ ok: true, user: student });
    } catch (error) {
      console.error('Student profile error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  // Смена пароля студента — JSON, уничтожает сессию при успехе
  static async studentChangePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      // Проверка совпадения паролей
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ ok: false, error: req.t('profile.passwords_not_match') });
      }

      // Проверка минимальной длины пароля
      if (newPassword.length < 6) {
        return res.status(400).json({ ok: false, error: req.t('profile.password_too_short') });
      }

      // Смена пароля через хранимую процедуру
      const result = await StudentProcedures.changePassword(
        req.session.userId,
        currentPassword,
        newPassword
      );

      if (result.success) {
        // Уничтожаем сессию, чтобы пользователь перелогинился с новым паролем
        req.session.destroy((err) => {
          if (err) console.error('Session destroy error:', err);
        });
        return res.json({ ok: true, message: req.t('profile.password_changed') });
      } else {
        return res.status(400).json({ ok: false, error: req.t(result.messageKey || 'profile.current_password_wrong') });
      }
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  // Профиль сотрудника — JSON
  static async staffProfile(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);

      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      res.json({ ok: true, user: sotrudnik });
    } catch (error) {
      console.error('Staff profile error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  // Смена пароля сотрудника — JSON, уничтожает сессию при успехе
  static async staffChangePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      // Проверка совпадения паролей
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ ok: false, error: req.t('profile.passwords_not_match') });
      }

      // Проверка минимальной длины пароля
      if (newPassword.length < 6) {
        return res.status(400).json({ ok: false, error: req.t('profile.password_too_short') });
      }

      // Смена пароля через хранимую процедуру
      const result = await SotrudnikProcedures.changePassword(
        req.session.userId,
        currentPassword,
        newPassword
      );

      if (result.success) {
        // Уничтожаем сессию, чтобы пользователь перелогинился с новым паролем
        req.session.destroy((err) => {
          if (err) console.error('Session destroy error:', err);
        });
        return res.json({ ok: true, message: req.t('profile.password_changed') });
      } else {
        return res.status(400).json({ ok: false, error: req.t(result.messageKey || 'profile.current_password_wrong') });
      }
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }
}

module.exports = ProfileController;
