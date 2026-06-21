const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const { requireAdmin } = require('../controllers/adminController');
const {
  getDiseaseLibrary,
  getDiseaseById,
  getAdminDiseaseLibrary,
  createAdminDisease,
  deleteAdminDisease,
  syncDiseaseLibrary,
} = require('../controllers/diseaseLibraryController');

// Public
router.get('/disease-library', getDiseaseLibrary);
router.get('/disease-library/:id', getDiseaseById);

// Admin only
router.get('/admin/disease-library', authenticate, requireAdmin, getAdminDiseaseLibrary);
router.post('/admin/disease-library', authenticate, requireAdmin, createAdminDisease);
router.delete('/admin/disease-library/:id', authenticate, requireAdmin, deleteAdminDisease);
router.post('/admin/disease-library/sync', authenticate, requireAdmin, syncDiseaseLibrary);

module.exports = router;
