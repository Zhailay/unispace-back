const express = require('express');
const router = express.Router();
const StudentController = require('../controllers/ucheb/studentController');

// Middleware для проверки авторизации сотрудника
const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

// Применяем middleware ко всем маршрутам
router.use(requireStaffAuth);

// Маршруты для students
router.get('/', StudentController.staffStudents);
router.post('/insert', StudentController.insertStudent);
router.post('/tb', StudentController.selectStudents);
router.post('/groups', StudentController.selectGroups);
router.post('/change_password', StudentController.changeStudentPassword);
router.put('/', StudentController.updateStudent);
router.delete('/', StudentController.deleteStudent);

module.exports = router;
