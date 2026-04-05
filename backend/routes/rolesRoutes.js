const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/rolesController');

router.get('/', auth, role('administrator'), c.listRoles);
router.post('/', auth, role('administrator'), c.createRole);
router.patch('/:name', auth, role('administrator'), c.updateRole);
router.delete('/:name', auth, role('administrator'), c.deleteRole);
router.put('/:name/permissions', auth, role('administrator'), c.saveRolePermissions);

module.exports = router;
