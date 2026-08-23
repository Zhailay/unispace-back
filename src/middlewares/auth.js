const StudentProcedures = require('../models/StudentProcedures');
const SotrudnikProcedures = require('../models/SotrudnikProcedures');

// Проверка аутентификации
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

// Проверка, что пользователь - студент
function requireStudent(req, res, next) {
  if (!req.session || !req.session.userId || req.session.userType !== 'student') {
    return res.status(403).render('error', {
      message: req.t('error.access_denied'),
      status: 403
    });
  }
  next();
}

// Проверка, что пользователь - сотрудник
function requireStaff(req, res, next) {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.status(403).render('error', {
      message: req.t('error.access_denied'),
      status: 403
    });
  }
  next();
}

// Middleware для загрузки данных текущего пользователя (используя хранимые процедуры)
async function loadCurrentUser(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      if (req.session.userType === 'student') {
        // Используем хранимую процедуру get_student_by_id
        const student = await StudentProcedures.findById(req.session.userId);
        if (student) {
          res.locals.currentUser = {
            ...student,
            type: 'student'
          };
        }
      } else if (req.session.userType === 'sotrudnik') {
        // Используем хранимую процедуру get_sotrudnik_by_id
        const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
        if (sotrudnik) {
          res.locals.currentUser = {
            ...sotrudnik,
            type: 'sotrudnik'
          };
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }
  next();
}

module.exports = {
  requireAuth,
  requireStudent,
  requireStaff,
  loadCurrentUser
};
