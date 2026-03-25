const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/roleGuard');
const c = require('../controllers/newsController');

router.get('/feed', auth, c.getNewsFeed);
router.get('/', auth, role('administrator'), c.getAllNews);
router.post('/', auth, role('administrator'), c.createNews);
router.patch('/:id', auth, role('administrator'), c.updateNews);
router.delete('/:id', auth, role('administrator'), c.deleteNews);

module.exports = router;
