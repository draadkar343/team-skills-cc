const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/notificationController');

router.get('/', auth, c.getNotifications);
router.post('/read-all', auth, c.markAllRead);
router.post('/:id/read', auth, c.markRead);

module.exports = router;
