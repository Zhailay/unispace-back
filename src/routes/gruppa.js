const express = require('express');
const router = express.Router();
const GruppaController = require('../controllers/ucheb/gruppaController');

// Middleware для проверки авторизации сотрудника
const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

// Применяем middleware ко всем маршрутам
router.use(requireStaffAuth);

// Маршруты для gruppa
router.get('/', GruppaController.staffGruppa);
router.post('/insert', GruppaController.insertGruppa);
router.post('/tb', GruppaController.selectGruppa);
router.put('/', GruppaController.updateGruppa);
router.delete('/', GruppaController.deleteGruppa);

module.exports = router;
