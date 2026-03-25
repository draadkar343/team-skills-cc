const router = require('express').Router();
const apiKeyAuth = require('../middleware/apiKeyAuth');
const c = require('../controllers/integrationsController');

router.get('/users', apiKeyAuth('users:read'), c.publicUsers);
router.get('/skills', apiKeyAuth('skills:read'), c.publicSkills);
router.get('/certifications', apiKeyAuth('certs:read'), c.publicCertifications);

module.exports = router;
