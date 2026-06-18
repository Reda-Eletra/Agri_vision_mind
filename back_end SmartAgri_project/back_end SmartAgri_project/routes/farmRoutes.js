const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const {
  createFarm, getFarms, getFarmById, updateFarm, deleteFarm,
  addCoordinate, getCoordinates, deleteCoordinate,
  createCycle, getCycles, updateCycle, deleteCycle,
} = require('../controllers/farmController');

// ─── Farms ────────────────────────────────────────────────────
router.post('/farms',        authenticate, createFarm);
router.get('/farms',         authenticate, getFarms);
router.get('/farms/:id',     authenticate, getFarmById);
router.patch('/farms/:id',   authenticate, updateFarm);
router.delete('/farms/:id',  authenticate, deleteFarm);

// ─── Coordinates ──────────────────────────────────────────────
router.post('/farms/:id/coordinates',  authenticate, addCoordinate);
router.get('/farms/:id/coordinates',   authenticate, getCoordinates);
router.delete('/coordinates/:id',      authenticate, deleteCoordinate);

// ─── Cycles ───────────────────────────────────────────────────
router.post('/farms/:id/cycles', authenticate, createCycle);
router.get('/farms/:id/cycles',  authenticate, getCycles);
router.patch('/cycles/:id',      authenticate, updateCycle);
router.delete('/cycles/:id',     authenticate, deleteCycle);

module.exports = router;
