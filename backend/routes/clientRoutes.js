const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/clientController');

const ADM = 'application_delivery_manager';

// Squad overview — all members with their allocation totals
router.get('/squad-overview', auth, role('manager', 'administrator', 'resourcing', ADM), c.getSquadOverview);

// Clients
router.get('/', auth, role('manager', 'administrator', 'resourcing', ADM), c.listClients);
router.post('/', auth, role('manager', 'administrator', ADM), c.createClient);
router.patch('/:id', auth, role('manager', 'administrator', ADM), c.updateClient);
router.delete('/:id', auth, role('manager', 'administrator', ADM), c.deleteClient);

// Allocations
router.get('/:id/allocations', auth, role('manager', 'administrator', 'resourcing', ADM), c.getClientAllocations);
router.post('/:id/allocations', auth, role('manager', 'administrator', ADM), c.addAllocation);
router.patch('/allocations/:id', auth, role('manager', 'administrator', ADM), c.updateAllocation);
router.delete('/allocations/:id', auth, role('manager', 'administrator', ADM), c.deleteAllocation);

// Systems (version tracking)
router.get('/:id/systems', auth, role('manager', 'administrator', 'resourcing', ADM), c.getClientSystems);
router.post('/:id/systems', auth, role('manager', 'administrator', ADM), c.addClientSystem);
router.patch('/systems/:id', auth, role('manager', 'administrator', ADM), c.updateClientSystem);
router.delete('/systems/:id', auth, role('manager', 'administrator', ADM), c.deleteClientSystem);

// Roadmap
router.get('/:id/roadmap', auth, role('manager', 'administrator', 'resourcing', ADM), c.getRoadmapItems);
router.post('/:id/roadmap', auth, role('manager', 'administrator', ADM), c.addRoadmapItem);
router.patch('/roadmap/:id', auth, role('manager', 'administrator', ADM), c.updateRoadmapItem);
router.delete('/roadmap/:id', auth, role('manager', 'administrator', ADM), c.deleteRoadmapItem);

// Contracts
router.get('/:id/contracts', auth, role('manager', 'administrator', 'resourcing', ADM), c.getContracts);
router.post('/:id/contracts', auth, role('manager', 'administrator', ADM), c.addContract);
router.patch('/contracts/:id', auth, role('manager', 'administrator', ADM), c.updateContract);
router.delete('/contracts/:id', auth, role('manager', 'administrator', ADM), c.deleteContract);

// Change Requests
router.get('/:id/change-requests',     auth, role('manager', 'administrator', 'resourcing', ADM), c.getChangeRequests);
router.post('/:id/change-requests',    auth, role('manager', 'administrator', ADM), c.addChangeRequest);
router.patch('/change-requests/:id',   auth, role('manager', 'administrator', ADM), c.updateChangeRequest);
router.delete('/change-requests/:id',  auth, role('manager', 'administrator', ADM), c.deleteChangeRequest);

module.exports = router;
