const router = require('express').Router();
const auth = require('../middleware/auth');
const c    = require('../controllers/directoryController');

router.get('/', auth, c.getDirectory);

module.exports = router;
