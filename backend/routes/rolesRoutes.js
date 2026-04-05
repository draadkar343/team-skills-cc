const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/rolesController');

router.get('/', auth, role('administrator'), c.listRoles);
router.patch('/:name', auth, role('administrator'), c.updateRole);
router.put('/:name/permissions', auth, role('administrator'), c.saveRolePermissions);

module.exports = router;
