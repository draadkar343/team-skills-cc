const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/authController');

router.post('/login', c.login);
router.get('/me', auth, c.getMe);
router.patch('/me/profile', auth, c.updateProfile);
router.patch('/change-password', auth, c.changePassword);

module.exports = router;
