const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/clientController');

// Squad overview — all members with their allocation totals
router.get('/squad-overview', auth, role('manager', 'administrator', 'resourcing'), c.getSquadOverview);

// Clients
router.get('/', auth, role('manager', 'administrator', 'resourcing'), c.listClients);
router.post('/', auth, role('manager', 'administrator'), c.createClient);
router.patch('/:id', auth, role('manager', 'administrator'), c.updateClient);
router.delete('/:id', auth, role('manager', 'administrator'), c.deleteClient);

// Allocations
router.get('/:id/allocations', auth, role('manager', 'administrator', 'resourcing'), c.getClientAllocations);
router.post('/:id/allocations', auth, role('manager', 'administrator'), c.addAllocation);
router.patch('/allocations/:id', auth, role('manager', 'administrator'), c.updateAllocation);
router.delete('/allocations/:id', auth, role('manager', 'administrator'), c.deleteAllocation);

// Systems (version tracking)
router.get('/:id/systems', auth, role('manager', 'administrator', 'resourcing'), c.getClientSystems);
router.post('/:id/systems', auth, role('manager', 'administrator'), c.addClientSystem);
router.patch('/systems/:id', auth, role('manager', 'administrator'), c.updateClientSystem);
router.delete('/systems/:id', auth, role('manager', 'administrator'), c.deleteClientSystem);

// Roadmap
router.get('/:id/roadmap', auth, role('manager', 'administrator', 'resourcing'), c.getRoadmapItems);
router.post('/:id/roadmap', auth, role('manager', 'administrator'), c.addRoadmapItem);
router.patch('/roadmap/:id', auth, role('manager', 'administrator'), c.updateRoadmapItem);
router.delete('/roadmap/:id', auth, role('manager', 'administrator'), c.deleteRoadmapItem);

// Contracts
router.get('/:id/contracts', auth, role('manager', 'administrator', 'resourcing'), c.getContracts);
router.post('/:id/contracts', auth, role('manager', 'administrator'), c.addContract);
router.patch('/contracts/:id', auth, role('manager', 'administrator'), c.updateContract);
router.delete('/contracts/:id', auth, role('manager', 'administrator'), c.deleteContract);

module.exports = router;
