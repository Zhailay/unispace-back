const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();
const TestUploadController = require('../controllers/ucheb/testUploadController');

// Гарантируем существование папки uploads/test_rtf
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'test_rtf');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.rtf') {
      return cb(new Error('Только RTF файлы'));
    }
    cb(null, true);
  },
  limits: { fileSize: 200 * 1024 * 1024 },
});

const requireStaffAuth = (req, res, next) => {
  if (!req.session || !req.session.userId || req.session.userType !== 'sotrudnik') {
    return res.redirect('/auth/login');
  }
  next();
};

router.use(requireStaffAuth);

router.get('/',                  TestUploadController.index);
router.post('/disciplines',      TestUploadController.getDisciplines);
router.post('/parse',            upload.single('rtfFile'), TestUploadController.parseRtf);
router.get('/preview',           TestUploadController.preview);
router.post('/save',             TestUploadController.saveTest);
router.get('/manage/:id',            TestUploadController.manageQuestions);
router.get('/manage/:id/questions',  TestUploadController.getQuestionsPaginated);
router.post('/question/toggle',      TestUploadController.toggleQuestion);
router.post('/question/update',  TestUploadController.updateQuestion);
router.post('/answer/update',    TestUploadController.updateAnswer);
router.post('/convert-formula',  TestUploadController.convertFormula);
router.delete('/:id',            TestUploadController.deleteTest);
router.post('/config/:id',       TestUploadController.saveConfig);
router.post('/raspisanie/:id',   TestUploadController.saveRaspisanie);
router.get('/raspisanie/:id',    TestUploadController.listRaspisanie);

module.exports = router;
