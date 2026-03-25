const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/integrationsController');

const admin = [auth, role('administrator')];

// API Keys
router.get('/api-keys', ...admin, c.listApiKeys);
router.post('/api-keys', ...admin, c.createApiKey);
router.patch('/api-keys/:id/revoke', ...admin, c.revokeApiKey);
router.delete('/api-keys/:id', ...admin, c.deleteApiKey);

// External integrations
router.get('/external', ...admin, c.listIntegrations);
router.get('/external/:id', ...admin, c.getIntegration);
router.post('/external', ...admin, c.createIntegration);
router.patch('/external/:id', ...admin, c.updateIntegration);
router.delete('/external/:id', ...admin, c.deleteIntegration);
router.post('/external/:id/test', ...admin, c.testIntegration);

// Webhooks
router.get('/webhooks', ...admin, c.listWebhooks);
router.post('/webhooks', ...admin, c.createWebhook);
router.patch('/webhooks/:id', ...admin, c.updateWebhook);
router.delete('/webhooks/:id', ...admin, c.deleteWebhook);
router.get('/webhooks/:id/deliveries', ...admin, c.getWebhookDeliveries);

module.exports = router;
