const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const { certificateUpload } = require('../config/multer');
const c = require('../controllers/certsController');

const upload = certificateUpload.single('certificate');

// Employee
router.get('/mine', auth, role('employee'), c.getMyCerts);
router.post('/mine', auth, role('employee'), upload, c.addCert);
router.patch('/mine/:id', auth, role('employee'), upload, c.updateCert);
router.delete('/mine/:id', auth, role('employee'), c.deleteCert);
router.post('/mine/:id/submit', auth, role('employee'), c.submitCert);

// Manager
router.get('/pending', auth, role('manager'), c.getPendingCerts);
router.post('/:id/approve', auth, role('manager'), c.approveCert);
router.post('/:id/reject', auth, role('manager'), c.rejectCert);

// Admin
router.get('/all', auth, role('administrator'), c.getAllCerts);

module.exports = router;
