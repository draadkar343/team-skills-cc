const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/userController');
const { csvUpload } = require('../config/multer');

router.get('/', auth, role('administrator'), c.listUsers);
router.post('/', auth, role('administrator', 'manager'), c.createUser);
router.post('/bulk-import', auth, role('administrator'), csvUpload.single('file'), c.bulkImport);
router.get('/:id', auth, role('administrator'), c.getUser);
router.patch('/:id', auth, role('administrator'), c.updateUser);
router.delete('/:id', auth, role('administrator'), c.deleteUser);
router.delete('/:id/permanent', auth, role('administrator'), c.permanentDeleteUser);
router.post('/:id/reset-password', auth, role('administrator'), c.resetPassword);

module.exports = router;
