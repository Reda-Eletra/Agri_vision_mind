const express    = require('express');
const router     = express.Router();
const authenticate = require('../middlewares/auth');
const upload       = require('../config/multer');
const { requireAdmin } = require('../controllers/adminController');
const {
  getNews,
  getNewsById,
  getAdminNews,
  createNews,
  deleteNews,
  syncNews,
} = require('../controllers/newsController');

// Public
router.get('/news',     getNews);
router.get('/news/:id', getNewsById);

// Admin only
router.get('/admin/news',         authenticate, requireAdmin, getAdminNews);
router.post('/admin/news',        authenticate, requireAdmin, upload.single('image'), createNews);
router.post('/admin/news/sync',   authenticate, requireAdmin, syncNews);
router.delete('/admin/news/:id',  authenticate, requireAdmin, deleteNews);

module.exports = router;
