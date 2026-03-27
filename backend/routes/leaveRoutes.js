const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/leaveController');

// Leave types — public read for dropdowns, admin write
router.get('/types', auth, c.listLeaveTypes);
router.post('/types', auth, role('administrator'), c.createLeaveType);
router.put('/types/:id', auth, role('administrator'), c.updateLeaveType);
router.delete('/types/:id', auth, role('administrator'), c.deleteLeaveType);

// Leave requests — all roles
router.get('/my', auth, c.getMyLeave);
router.post('/', auth, c.createLeave);
router.patch('/:id/cancel', auth, c.cancelLeave);

// Manager approval
router.get('/pending', auth, role('manager', 'administrator'), c.getPendingLeave);
router.patch('/:id/approve', auth, role('manager', 'administrator'), c.approveLeave);
router.patch('/:id/reject', auth, role('manager', 'administrator'), c.rejectLeave);

// AI leave suggestions — all roles
router.get('/suggestions', auth, c.getSuggestions);

// Team calendar — all roles
router.get('/team-calendar', auth, c.getTeamCalendar);

// Admin overview
router.get('/all', auth, role('administrator'), c.getAllLeave);

module.exports = router;
