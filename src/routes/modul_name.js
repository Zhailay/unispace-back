const express = require('express');
const router = express.Router();
const ModulNameController = require('../controllers/ucheb/modulNameController');

const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

router.use(requireStaffAuth);

router.get('/', ModulNameController.staffModulName);
router.post('/insert', ModulNameController.insertModulName);
router.post('/tb', ModulNameController.selectModulName);
router.put('/', ModulNameController.updateModulName);
router.delete('/', ModulNameController.deleteModulName);

module.exports = router;
