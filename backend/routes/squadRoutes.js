const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/squadController');

router.get('/my-squad', auth, role('manager'), c.getMySquad);
router.get('/my-squad-info', auth, role('employee'), c.getEmployeeSquad);
router.get('/unassigned', auth, role('manager', 'administrator'), c.getUnassignedEmployees);
router.get('/managers', auth, role('administrator'), c.listManagers);
router.get('/', auth, role('manager', 'administrator'), c.listSquads);
router.post('/', auth, role('administrator'), c.createSquad);
router.get('/:id', auth, role('manager', 'administrator'), c.getSquad);
router.patch('/:id', auth, role('administrator'), c.updateSquad);
router.delete('/:id', auth, role('administrator'), c.deleteSquad);
router.post('/:id/members', auth, role('manager', 'administrator'), c.addMember);
router.delete('/:id/members/:userId', auth, role('manager', 'administrator'), c.removeMember);

module.exports = router;
