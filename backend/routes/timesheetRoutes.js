const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/timesheetController');

// Admin
router.get('/all', auth, role('administrator'), c.getAllTimesheets);

// Manager
router.get('/pending', auth, role('manager'), c.getPendingTimesheets);
router.post('/:id/approve', auth, role('manager'), c.approveTimesheet);
router.post('/:id/reject', auth, role('manager'), c.rejectTimesheet);

// Employee
router.get('/mine', auth, role('employee'), c.getMyTimesheets);
router.post('/', auth, role('employee'), c.createTimesheet);
router.get('/:id', auth, c.getTimesheet);
router.patch('/:id', auth, role('employee'), c.updateTimesheet);
router.delete('/:id', auth, role('employee'), c.deleteTimesheet);
router.post('/:id/submit', auth, role('employee'), c.submitTimesheet);
router.post('/:id/entries', auth, role('employee'), c.addEntry);
router.patch('/:id/entries/:entryId', auth, role('employee'), c.updateEntry);
router.delete('/:id/entries/:entryId', auth, role('employee'), c.deleteEntry);

module.exports = router;
