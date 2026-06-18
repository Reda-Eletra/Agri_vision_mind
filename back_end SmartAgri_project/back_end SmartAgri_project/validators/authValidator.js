const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().max(20).optional(),
  location: Joi.string().max(150).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  phone: Joi.string().max(20).allow('', null),
  location: Joi.string().max(150).allow('', null),
  avatar: Joi.boolean(),
}).min(1);

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  new_password: Joi.string().min(6).required(),
  confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
    .messages({ 'any.only': 'Passwords do not match' }),
});

const updatePasswordSchema = Joi.object({
  current_password: Joi.string().required()
    .messages({ 'any.required': 'Current password is required' }),
  new_password: Joi.string().min(6).required()
    .messages({
      'any.required': 'New password is required',
      'string.min': 'New password must be at least 6 characters',
    }),
  confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
    .messages({
      'any.required': 'Password confirmation is required',
      'any.only': 'Passwords do not match',
    }),
});

const updateEmailSchema = Joi.object({
  new_email: Joi.string().email().required(),
  password: Joi.string().required()
    .messages({ 'any.required': 'Password is required to change email' }),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  updateEmailSchema,
};
