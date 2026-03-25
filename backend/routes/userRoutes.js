const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/userController');

router.get('/', auth, role('administrator'), c.listUsers);
router.post('/', auth, role('administrator', 'manager'), c.createUser);
router.get('/:id', auth, role('administrator'), c.getUser);
router.patch('/:id', auth, role('administrator'), c.updateUser);
router.delete('/:id', auth, role('administrator'), c.deleteUser);
router.post('/:id/reset-password', auth, role('administrator'), c.resetPassword);

module.exports = router;
