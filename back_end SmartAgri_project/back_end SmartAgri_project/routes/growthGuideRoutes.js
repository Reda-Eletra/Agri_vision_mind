const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const { requireAdmin } = require('../controllers/adminController');
const {
  getPlants,
  getPlantByIdOrSlug,
  syncGrowthGuides,
  getSyncStatus,
} = require('../controllers/growthGuideController');

// Public endpoints
router.get('/growth-guides', getPlants);
router.get('/growth-guides/:idOrSlug', getPlantByIdOrSlug);

module.exports = router;
