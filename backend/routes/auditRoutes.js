const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/auditController');

router.get('/', auth, role('administrator'), c.getAuditLog);
router.get('/tables', auth, role('administrator'), c.getTables);
router.get('/retention', auth, role('administrator'), c.getRetentionPolicies);
router.put('/retention', auth, role('administrator'), c.saveRetentionPolicies);
router.post('/purge', auth, role('administrator'), c.purgeByRetention);

module.exports = router;
