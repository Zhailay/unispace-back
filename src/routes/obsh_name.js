const express = require('express');
const router = express.Router();
const ObshNameController = require('../controllers/ucheb/obshNameController');

const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

router.use(requireStaffAuth);

router.get('/', ObshNameController.staffObshName);
router.post('/insert', ObshNameController.insertObshName);
router.post('/tb', ObshNameController.selectObshName);
router.put('/', ObshNameController.updateObshName);
router.delete('/', ObshNameController.deleteObshName);

module.exports = router;
