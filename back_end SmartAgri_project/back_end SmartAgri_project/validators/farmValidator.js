const Joi = require("joi");

const createFarmSchema = Joi.object({
  name: Joi.string().max(150).required(),
  area: Joi.number().positive().required(),
  area_unit: Joi.string().valid("acre", "hectare").optional(),
  soil_type: Joi.string().max(100).optional(),
  image_url: Joi.string()
    .uri({ allowRelative: true })
    .optional()
    .allow("", null),
  location: Joi.string().max(200).optional().allow("", null),
  satellite_polygon_id: Joi.string().max(200).optional().allow("", null),
});

const updateFarmSchema = Joi.object({
  name: Joi.string().max(150),
  area: Joi.number().positive(),
  area_unit: Joi.string().valid("acre", "hectare"),
  soil_type: Joi.string().max(100),
  image_url: Joi.string().uri({ allowRelative: true }).allow("", null),
  location: Joi.string().max(200).allow("", null),
  satellite_polygon_id: Joi.string().max(200).allow("", null),
}).min(1);

const coordinateSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  order_index: Joi.number().integer().min(0).required(),
});

const cycleSchema = Joi.object({
  crop: Joi.string().max(150).required(),
  season: Joi.string().max(100).required(),
  planting_date: Joi.date().required(),
  harvest_date: Joi.date().optional(),
  status: Joi.string().valid("active", "completed", "paused").optional(),
});

const updateCycleSchema = Joi.object({
  crop: Joi.string().max(150),
  season: Joi.string().max(100),
  planting_date: Joi.date(),
  harvest_date: Joi.date(),
  status: Joi.string().valid("active", "completed", "paused"),
}).min(1);

module.exports = {
  createFarmSchema,
  updateFarmSchema,
  coordinateSchema,
  cycleSchema,
  updateCycleSchema,
};
