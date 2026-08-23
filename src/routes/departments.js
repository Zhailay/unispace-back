const express = require('express');
const router = express.Router();
const DepartmentsController = require('../controllers/departmentsController');

// Middleware для проверки авторизации сотрудника
const staffDepartments = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

// Применяем middleware ко всем маршрутам
router.use(staffDepartments);

// Департаменты сотрудника
router.get('/departments', DepartmentsController.staffDepartments);
// router.get('/departments-load', DepartmentsController.staffDepartments);
// router.post('/departments', DepartmentsController.staffDepartmentsSave);
// router.delete('/departments', DepartmentsController.staffDepartmentsSave);
// router.put('/departments', DepartmentsController.staffDepartmentsSave);

module.exports = router;
