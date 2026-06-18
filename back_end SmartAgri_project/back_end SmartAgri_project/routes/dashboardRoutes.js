const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const {
  getOverview,
  getRecentScans,
  getUpcomingTasks,
  getDiseaseDistribution,
  getFarmExpenses,
  getPlantHealthTrend,
} = require('../controllers/dashboardController');

router.get('/dashboard/overview', authenticate, getOverview);
router.get('/dashboard/recent-scans', authenticate, getRecentScans);
router.get('/dashboard/upcoming-tasks', authenticate, getUpcomingTasks);
router.get('/dashboard/disease-distribution', authenticate, getDiseaseDistribution);
router.get('/dashboard/farm-expenses', authenticate, getFarmExpenses);
router.get('/dashboard/plant-health', authenticate, getPlantHealthTrend);

module.exports = router;
