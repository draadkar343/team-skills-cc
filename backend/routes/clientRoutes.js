const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/clientController');

// Squad overview — all members with their allocation totals
router.get('/squad-overview', auth, role('manager', 'administrator'), c.getSquadOverview);

// Clients
router.get('/', auth, role('manager', 'administrator'), c.listClients);
router.post('/', auth, role('manager', 'administrator'), c.createClient);
router.patch('/:id', auth, role('manager', 'administrator'), c.updateClient);
router.delete('/:id', auth, role('manager', 'administrator'), c.deleteClient);

// Allocations
router.get('/:id/allocations', auth, role('manager', 'administrator'), c.getClientAllocations);
router.post('/:id/allocations', auth, role('manager', 'administrator'), c.addAllocation);
router.patch('/allocations/:id', auth, role('manager', 'administrator'), c.updateAllocation);
router.delete('/allocations/:id', auth, role('manager', 'administrator'), c.deleteAllocation);

module.exports = router;
