const express = require('express');
const router = express.Router();
const EmployeesController = require('../controllers/employeesController');

// Middleware для проверки авторизации сотрудника
const staffEmployees = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

// Применяем middleware ко всем маршрутам
router.use(staffEmployees);

// Департаменты сотрудника
router.get('/employees', EmployeesController.staffEmployees);
// router.get('/departments-load', DepartmentsController.staffDepartments);
// router.post('/departments', DepartmentsController.staffDepartmentsSave);
// router.delete('/departments', DepartmentsController.staffDepartmentsSave);
// router.put('/departments', DepartmentsController.staffDepartmentsSave);

module.exports = router;
