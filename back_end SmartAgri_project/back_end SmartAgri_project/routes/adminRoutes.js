const express = require('express');
const router  = express.Router();
const authenticate = require('../middlewares/auth');
const {
  requireAdmin,
  getStats,
  getUsers,
  updateUser,
  deleteUser,
  getUserDiagnoses,
  getUserDetails,
  getAllPosts,
  adminDeletePost,
  getAdminGrowthGuides,
  createAdminGrowthGuide,
  updateAdminGrowthGuide,
  deleteAdminGrowthGuide,
  toggleVisibilityAdminGrowthGuide,
  syncAdminGrowthGuides,
  getAdminGrowthGuidesSyncStatus,
} = require('../controllers/adminController');

router.get('/admin/stats',                   authenticate, requireAdmin, getStats);
router.get('/admin/users',                   authenticate, requireAdmin, getUsers);
router.patch('/admin/users/:id',             authenticate, requireAdmin, updateUser);
router.delete('/admin/users/:id',            authenticate, requireAdmin, deleteUser);
router.get('/admin/users/:id/diagnoses',     authenticate, requireAdmin, getUserDiagnoses);
router.get('/admin/users/:id/details',       authenticate, requireAdmin, getUserDetails);
router.get('/admin/posts',                   authenticate, requireAdmin, getAllPosts);
router.delete('/admin/posts/:id',            authenticate, requireAdmin, adminDeletePost);

// Admin Growth Guide Management routes
router.get('/admin/growth-guides',                       authenticate, requireAdmin, getAdminGrowthGuides);
router.post('/admin/growth-guides',                      authenticate, requireAdmin, createAdminGrowthGuide);
router.patch('/admin/growth-guides/:id',                 authenticate, requireAdmin, updateAdminGrowthGuide);
router.delete('/admin/growth-guides/:id',                authenticate, requireAdmin, deleteAdminGrowthGuide);
router.patch('/admin/growth-guides/:id/toggle-visibility', authenticate, requireAdmin, toggleVisibilityAdminGrowthGuide);
router.post('/admin/growth-guides/sync',                 authenticate, requireAdmin, syncAdminGrowthGuides);
router.get('/admin/growth-guides/sync-status',           authenticate, requireAdmin, getAdminGrowthGuidesSyncStatus);

module.exports = router;
