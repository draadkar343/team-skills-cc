const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/roleGuard');
const c      = require('../controllers/onboardingController');

// Employee
router.get('/me',                          auth, c.getMyOnboarding);
router.patch('/me/tasks/:taskId/toggle',   auth, c.toggleTask);

// Admin — templates
router.get('/templates',                   auth, role('administrator'), c.listTemplates);
router.post('/templates',                  auth, role('administrator'), c.createTemplate);
router.patch('/templates/:id',             auth, role('administrator'), c.updateTemplate);
router.delete('/templates/:id',            auth, role('administrator'), c.deleteTemplate);
router.post('/templates/:id/tasks',        auth, role('administrator'), c.addTask);
router.patch('/templates/:id/tasks/:taskId',  auth, role('administrator'), c.updateTask);
router.delete('/templates/:id/tasks/:taskId', auth, role('administrator'), c.deleteTask);

// Admin — assignments
router.get('/assignments',                 auth, role('administrator'), c.listAssignments);
router.post('/assignments',                auth, role('administrator'), c.assign);
router.delete('/assignments/:id',          auth, role('administrator'), c.removeAssignment);

module.exports = router;
