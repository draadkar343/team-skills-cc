const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c    = require('../controllers/orgController');

router.get('/chart',   auth, c.getChart);
router.post('/smes',   auth, role('administrator'), c.addSme);
router.delete('/smes/:id', auth, role('administrator'), c.removeSme);

module.exports = router;
