const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/skillController');
const { csvUpload } = require('../config/multer');

// Bulk CSV upload (admin only)
router.post('/bulk-upload/main-skills', auth, role('administrator'), csvUpload.single('file'), c.bulkUploadMainSkills);
router.post('/bulk-upload/sub-skills', auth, role('administrator'), csvUpload.single('file'), c.bulkUploadSubSkills);

// Catalogue (any authenticated)
router.get('/catalogue', auth, c.getCatalogue);
router.get('/categories', auth, c.getCategories);
router.post('/categories', auth, role('administrator'), c.createCategory);
router.post('/catalogue', auth, role('administrator'), c.createCatalogueSkill);
router.patch('/catalogue/:id', auth, role('administrator'), c.updateCatalogueSkill);

// Admin view all
router.get('/all', auth, role('administrator'), c.getAllSkills);
router.get('/catalogue/all', auth, role('administrator'), c.getAllCatalogue);

// Heatmap — manager (squad) or admin (all)
router.get('/heatmap', auth, role('administrator', 'manager'), c.getSkillsHeatmap);

// Manager approvals
router.get('/pending', auth, role('manager'), c.getPendingSkills);
router.post('/bulk-approve', auth, role('manager'), c.bulkApproveSkills);
router.post('/:id/approve', auth, role('manager'), c.approveSkill);
router.post('/:id/reject', auth, role('manager'), c.rejectSkill);

// Employee
router.get('/mine', auth, role('employee'), c.getMySkills);
router.post('/mine', auth, role('employee'), c.addSkill);
router.post('/mine/submit-all', auth, role('employee'), c.submitAllSkills);
router.patch('/mine/:id', auth, role('employee'), c.updateMySkill);
router.delete('/mine/:id', auth, role('employee'), c.deleteMySkill);
router.post('/mine/:id/submit', auth, role('employee'), c.submitSkill);

module.exports = router;
