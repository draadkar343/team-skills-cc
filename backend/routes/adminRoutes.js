const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const upload = require('../config/multer');
const c = require('../controllers/adminController');

router.get('/public-config', c.getPublicConfig);
router.get('/config', auth, c.getConfig);
router.patch('/config', auth, role('administrator'), c.updateConfig);
router.post('/logo', auth, role('administrator'), upload.single('logo'), c.uploadLogo);
router.post('/login-bg', auth, role('administrator'), upload.single('login_bg'), c.uploadLoginBg);
router.delete('/login-bg', auth, role('administrator'), c.removeLoginBg);
router.get('/stats', auth, role('administrator'), c.getStats);

module.exports = router;
