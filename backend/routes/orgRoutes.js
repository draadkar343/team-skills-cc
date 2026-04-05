const router = require('express').Router();
const auth = require('../middleware/auth');
const c    = require('../controllers/orgController');

router.get('/chart', auth, c.getChart);

module.exports = router;
