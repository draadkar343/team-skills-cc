const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/jobRoleController');

// Job Roles — read by all, write by admin only
router.get('/', auth, c.listJobRoles);
router.post('/', auth, role('administrator'), c.createJobRole);
router.patch('/:id', auth, role('administrator'), c.updateJobRole);
router.delete('/:id', auth, role('administrator'), c.deleteJobRole);

// Main Skills — read by all, write by admin + manager
router.get('/main-skills', auth, c.listMainSkills);
router.post('/main-skills', auth, role('administrator', 'manager'), c.createMainSkill);
router.patch('/main-skills/:id', auth, role('administrator', 'manager'), c.updateMainSkill);
router.delete('/main-skills/:id', auth, role('administrator', 'manager'), c.deleteMainSkill);

module.exports = router;
