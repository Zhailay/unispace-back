const express = require('express');
const router = express.Router();
const DepartmentsController = require('../controllers/departmentsController');
const PositionsController = require('../controllers/positionsController');
const EmployeesController = require('../controllers/employeesController');

// Middleware для проверки авторизации сотрудника
const requireStaff = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

// Применяем middleware ко всем маршрутам
router.use(requireStaff);

// Департаменты
router.get('/departments', DepartmentsController.staffDepartments);
router.post('/departments', DepartmentsController.createDepartment);
router.post('/departments/:id/update', DepartmentsController.updateDepartment);
router.post('/departments/:id/delete', DepartmentsController.deleteDepartment);

// Должности
router.get('/positions', PositionsController.staffPositions);
router.post('/positions', PositionsController.createPosition);
router.post('/positions/:id/update', PositionsController.updatePosition);
router.post('/positions/:id/delete', PositionsController.deletePosition);

// Сотрудники
router.get('/employees', EmployeesController.staffEmployees);
router.post('/employees', EmployeesController.createEmployee);
router.post('/employees/:id/update', EmployeesController.updateEmployee);
router.post('/employees/:id/delete', EmployeesController.deleteEmployee);

module.exports = router;
