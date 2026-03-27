const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleMiddleware');
const c = require('../controllers/resourcingController');

router.get('/overview', auth, role('administrator', 'resourcing'), c.getOverview);

module.exports = router;
