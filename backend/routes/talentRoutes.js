const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const { cvUpload } = require('../config/multer');
const c = require('../controllers/talentController');

const allowed = role('administrator', 'resourcing');

router.get('/', auth, allowed, c.listCandidates);
router.post('/', auth, allowed, c.createCandidate);
router.get('/:id', auth, allowed, c.getCandidate);
router.patch('/:id', auth, allowed, c.updateCandidate);
router.post('/:id/stage', auth, allowed, c.changeStage);
router.post('/:id/cv', auth, allowed, cvUpload.single('cv'), c.uploadCV);
router.post('/:id/cv/parse', auth, allowed, c.parseCV);
router.delete('/:id/cv', auth, allowed, c.deleteCV);
router.delete('/:id', auth, allowed, c.deleteCandidate);

module.exports = router;
