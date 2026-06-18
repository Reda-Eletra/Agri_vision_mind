const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authenticate = require('../middlewares/auth');
const upload = require('../config/multer');
const {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  updatePassword,
  updateEmail,
  googleCallback,
} = require('../controllers/authController');

const googleAuthEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL
);

// ─── Local Auth ───────────────────────────────────────────
router.post('/auth/register', register);
router.post('/auth/login', login);

// ─── Profile ─────────────────────────────────────────────
router.get('/users/profile', authenticate, getProfile);
router.patch('/users/profile', authenticate, upload.single('avatar'), updateProfile);

// ─── Password Management ──────────────────────────────────
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);
router.patch('/users/update-password', authenticate, updatePassword);

// ─── Email Update ─────────────────────────────────────────
router.patch('/users/update-email', authenticate, updateEmail);

// ─── Google OAuth ─────────────────────────────────────────
// Step 1: Redirect to Google consent screen
if (googleAuthEnabled) {
  router.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
  );

  // Step 2: Google redirects here after login
  router.get(
    '/auth/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/google/error`,
    }),
    googleCallback
  );
} else {
  const oauthDisabled = (_req, res) =>
    res.status(503).json({
      error: 'Google OAuth is not configured on this server.',
    });

  router.get('/auth/google', oauthDisabled);
  router.get('/auth/google/callback', oauthDisabled);
}

module.exports = router;
