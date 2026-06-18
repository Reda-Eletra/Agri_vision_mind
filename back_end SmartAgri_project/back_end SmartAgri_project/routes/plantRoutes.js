const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const upload = require('../config/multer');
const {
  createPlant, createPlantFromDiagnosis, getPlants, getPlantById,
  scanPlant, deletePlant, addProgressLog, getProgressLogs,
} = require('../controllers/plantController');
const { createTask, getTasks, updateTask, deleteTask } = require('../controllers/taskController');

// Plants
router.post('/cycles/:id/plants', authenticate, createPlant);
router.post('/cycles/:id/plants/from-diagnosis', authenticate, createPlantFromDiagnosis);
router.get('/cycles/:id/plants', authenticate, getPlants);
router.get('/plants/:id', authenticate, getPlantById);
router.delete('/plants/:id', authenticate, deletePlant);

// AI Scan
router.post('/plants/:id/scan', authenticate, upload.single('image'), scanPlant);

// Progress Logs
router.post('/plants/:id/progress-log', authenticate, upload.single('image'), addProgressLog);
router.get('/plants/:id/progress-logs', authenticate, getProgressLogs);

// Tasks
router.post('/cycles/:id/tasks', authenticate, createTask);
router.get('/cycles/:id/tasks', authenticate, getTasks);
router.patch('/tasks/:id', authenticate, updateTask);
router.delete('/tasks/:id', authenticate, deleteTask);

module.exports = router;
