const router = require('express').Router();
const auth = require('../middleware/auth');
const { avatarUpload } = require('../config/multer');
const c = require('../controllers/authController');
const { getMyPermissions } = require('../controllers/rolesController');

router.post('/login', c.login);
router.post('/forgot-password', c.forgotPassword);
router.post('/reset-password', c.resetPassword);
router.get('/me', auth, c.getMe);
router.get('/my-permissions', auth, getMyPermissions);
router.get('/me/public-holidays', auth, c.getPublicHolidays);
router.patch('/me/profile', auth, c.updateProfile);
router.patch('/me/avatar', auth, avatarUpload.single('avatar'), c.uploadAvatar);
router.patch('/change-password', auth, c.changePassword);

module.exports = router;
