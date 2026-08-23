const express = require('express');
const router = express.Router();
const PositionsController = require('../controllers/positionsController');

// Middleware для проверки авторизации сотрудника
const staffPositions = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

// Применяем middleware ко всем маршрутам
router.use(staffPositions);

// Департаменты сотрудника
router.get('/positions', PositionsController.staffPositions);
// router.get('/departments-load', DepartmentsController.staffDepartments);
// router.post('/departments', DepartmentsController.staffDepartmentsSave);
// router.delete('/departments', DepartmentsController.staffDepartmentsSave);
// router.put('/departments', DepartmentsController.staffDepartmentsSave);

module.exports = router;
