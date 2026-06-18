const express = require('express');
const router  = express.Router();
const authenticate = require('../middlewares/auth');
const upload = require('../config/multer');
const {
  createUserPlant,
  getUserPlants,
  getUserPlantById,
  updateUserPlant,
  deleteUserPlant,
  analyzePlantDoctor,
  createDiagnosisHistory,
  getDiagnosisHistory,
} = require('../controllers/userPlantsController');

// ─── Tracked Plants (standalone – no cycle/farm required) ────
router.post('/my-plants',       authenticate, upload.single('image'), createUserPlant);
router.get('/my-plants',        authenticate, getUserPlants);
router.get('/my-plants/:id',    authenticate, getUserPlantById);
router.patch('/my-plants/:id',  authenticate, upload.single('image'), updateUserPlant);
router.delete('/my-plants/:id', authenticate, deleteUserPlant);

// ─── Diagnosis History ────────────────────────────────────────
router.post('/plant-doctor/analyze', authenticate, upload.single('image'), analyzePlantDoctor);
router.post('/diagnosis-history', authenticate, upload.single('image'), createDiagnosisHistory);
router.get('/diagnosis-history',  authenticate, getDiagnosisHistory);

module.exports = router;
