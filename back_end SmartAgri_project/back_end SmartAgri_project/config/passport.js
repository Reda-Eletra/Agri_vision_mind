const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./database');
require('dotenv').config();

const hasGoogleCredentials = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL
);

if (hasGoogleCredentials) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const googleId = profile.id;
          const name = profile.displayName;
          const avatar = profile.photos?.[0]?.value || null;

          // Check if user already exists by Google ID
          let result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);

          if (result.rows.length > 0) {
            return done(null, result.rows[0]);
          }

          // Check if email already registered via local
          result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

          if (result.rows.length > 0) {
            // Link Google account to existing local account
            const updated = await pool.query(
              `UPDATE users SET google_id = $1, auth_provider = 'google', avatar_url = COALESCE(avatar_url, $2),
               is_email_verified = TRUE, updated_at = NOW()
               WHERE email = $3 RETURNING *`,
              [googleId, avatar, email]
            );
            return done(null, updated.rows[0]);
          }

          // Create brand-new Google user
          const newUser = await pool.query(
            `INSERT INTO users (name, email, google_id, avatar_url, auth_provider, is_email_verified)
             VALUES ($1, $2, $3, $4, 'google', TRUE) RETURNING *`,
            [name, email, googleId, avatar]
          );

          return done(null, newUser.rows[0]);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn(
    'Google OAuth is disabled: set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL to enable it.'
  );
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
