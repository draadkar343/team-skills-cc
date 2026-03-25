const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/auditController');

router.get('/', auth, role('administrator'), c.getAuditLog);
router.get('/tables', auth, role('administrator'), c.getTables);

module.exports = router;
