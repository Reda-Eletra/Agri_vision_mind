const Joi = require("joi");

// ─── Tracked Plants (cycle-based) ────────────────────────────
const createPlantSchema = Joi.object({
  user_defined_name: Joi.string().min(2).max(200).required(),
  species_name: Joi.string().min(2).max(150).required(),
  image_url: Joi.string().optional().allow("", null),
  recovery_progress_percent: Joi.number().min(0).max(100).optional(),
});

// ─── Progress Log ─────────────────────────────────────────────
const progressLogSchema = Joi.object({
  note: Joi.string().optional(),
  recovery_percent: Joi.number().min(0).max(100).optional(),
});

// ─── Schedule Tasks ──────────────────────────────────────────
const createTaskSchema = Joi.object({
  task_name: Joi.string().min(2).max(200).required(),
  task_type: Joi.string()
    .valid("watering", "fertilizing", "harvesting", "spraying", "other")
    .optional(),
  date: Joi.date().required(),
});

const updateTaskSchema = Joi.object({
  task_name: Joi.string().min(2).max(200),
  task_type: Joi.string().valid(
    "watering",
    "fertilizing",
    "harvesting",
    "spraying",
    "other"
  ),
  date: Joi.date(),
  completed: Joi.boolean(),
}).min(1);

// ─── Posts ────────────────────────────────────────────────────
const createPostSchema = Joi.object({
  title: Joi.string().min(2).max(300).required(),
  body: Joi.string().min(5).optional(), // sent from backend-native calls
  content: Joi.string().min(5).optional(), // sent from Frontend
  category: Joi.string()
    .valid("general", "question", "tips", "showcase")
    .optional(),
}).or("body", "content");

const createCommentSchema = Joi.object({
  body: Joi.string().min(1).optional(),
  content: Joi.string().min(1).optional(),
}).or("body", "content");

// ─── Transactions ─────────────────────────────────────────────
const transactionSchema = Joi.object({
  amount: Joi.number().positive().required(),
  type: Joi.string().valid("income", "expense").required(),
  category: Joi.string().max(100).optional(),
  description: Joi.string().optional().allow("", null),
  date: Joi.date().required(),
  farm_id: Joi.string().uuid().optional().allow("", null),
  farmId: Joi.string().optional().allow("", null), // Frontend camelCase alias
});

// ─── User Tracked Plants (standalone) ────────────────────────
const createUserPlantSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  species_name: Joi.string().max(150).optional().allow("", null),
  image_url: Joi.string().optional().allow("", null),
  health_status: Joi.string()
    .valid("healthy", "infected", "recovering", "dead")
    .optional(),
  recovery_progress_percent: Joi.number().min(0).max(100).optional(),
  last_check_date: Joi.date().optional(),
  diagnosis_json: Joi.object().optional().allow(null),
  progress_log_json: Joi.array().optional(),
});

const updateUserPlantSchema = Joi.object({
  name: Joi.string().min(1).max(200),
  species_name: Joi.string().max(150).allow("", null),
  image_url: Joi.string().allow("", null),
  health_status: Joi.string().valid(
    "healthy",
    "infected",
    "recovering",
    "dead"
  ),
  recovery_progress_percent: Joi.number().min(0).max(100),
  last_check_date: Joi.date(),
  diagnosis_json: Joi.object().allow(null),
  progress_log_json: Joi.array(),
}).min(1);

// ─── User Diagnosis History ───────────────────────────────────
const createDiagnosisHistorySchema = Joi.object({
  plant_name: Joi.string().max(200).optional().allow("", null),
  image_url: Joi.string().optional().allow("", null),
  diagnosis: Joi.object().required(),
  date: Joi.date().optional(),
});

module.exports = {
  createPlantSchema,
  progressLogSchema,
  createTaskSchema,
  updateTaskSchema,
  createPostSchema,
  createCommentSchema,
  transactionSchema,
  createUserPlantSchema,
  updateUserPlantSchema,
  createDiagnosisHistorySchema,
};
