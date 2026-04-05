const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/roleGuard');
const c      = require('../controllers/reportController');

router.get('/skills',     auth, role('administrator'), c.skillsReport);
router.get('/timesheets', auth, role('administrator'), c.timesheetReport);
router.get('/certs',      auth, role('administrator'), c.certReport);
router.get('/leave',      auth, role('administrator'), c.leaveReport);
router.get('/allocation', auth, role('administrator'), c.allocationReport);
router.get('/talent',     auth, role('administrator'), c.talentReport);
router.get('/kudos',      auth, role('administrator'), c.kudosReport);

module.exports = router;
