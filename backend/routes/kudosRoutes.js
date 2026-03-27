const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/kudosController');

router.get('/', auth, c.listKudos);
router.get('/mine', auth, c.getMyKudos);
router.get('/user/:id', auth, role('manager', 'administrator', 'resourcing'), c.getUserKudos);
router.post('/', auth, c.sendKudos);
router.delete('/:id', auth, role('administrator'), c.deleteKudos);

module.exports = router;
