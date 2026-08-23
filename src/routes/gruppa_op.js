const express = require('express');
const router = express.Router();
const GruppaOpController = require('../controllers/ucheb/gruppaOpController');

// Middleware для проверки авторизации сотрудника
const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

// Применяем middleware ко всем маршрутам
router.use(requireStaffAuth);

// Маршруты для gruppa_op
router.get('/', GruppaOpController.staffGruppaOp);
router.post('/insert', GruppaOpController.insertGruppaOp);
router.post('/tb', GruppaOpController.selectGruppaOp);
router.put('/', GruppaOpController.updateGruppaOp);
router.delete('/', GruppaOpController.deleteGruppaOp);

module.exports = router;
