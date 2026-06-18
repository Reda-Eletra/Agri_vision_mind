const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const {
  sendResetPasswordEmail,
  sendEmailUpdateNotification,
} = require("../config/mailer");
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  updateEmailSchema,
} = require("../validators/authValidator");
require("dotenv").config();
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/secrets");
const { v4: uuidv4 } = require('uuid');

// ─── Helper: resolve role for a given email ───────────────
const resolveRole = (email) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return adminEmails.includes((email || '').toLowerCase()) ? 'admin' : 'user';
};

// ─── Helper: generate signed JWT (includes role) ─────────
const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role || resolveRole(user.email) || 'user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

// ─── POST /auth/register ──────────────────────────────────
const register = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const { name, email, password, phone, location } = req.body;
    let { username } = req.body;

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "Email already registered" });

    if (!username) {
      const localPart = email.split('@')[0];
      username = localPart.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!username) username = 'user';
      const userExistCheck = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
      if (userExistCheck.rows.length > 0) {
        username = `${username}_${Math.floor(1000 + Math.random() * 9000)}`;
      }
    } else {
      const userExistCheck = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
      if (userExistCheck.rows.length > 0) {
        return res.status(409).json({ error: "Username already taken" });
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const result = await pool.query(
      `INSERT INTO users (id, name, email, username, password, phone, location, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'user', TRUE)
       RETURNING id, name, email, username, phone, location, auth_provider, role, is_active, created_at`,
      [userId, name, email, username, hashed, phone || null, location || null]
    );

    const user = result.rows[0];
    res.status(201).json({
      message: "Registration successful",
      data: { user, token: signToken(user) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /auth/login ─────────────────────────────────────
const login = async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const { email, password } = req.body;
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR username = $1 LIMIT 1",
      [email]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ error: "Invalid username/email or password" });

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: "This account has been disabled. Please contact the administrator." });
    }

    if (!user.password)
      return res.status(401).json({
        error: "This account uses Google login. Please sign in with Google.",
      });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: "Invalid username/email or password" });

    const { password: _, ...userData } = user;
    const userRole = user.role || resolveRole(user.email) || 'user';
    res.json({
      message: "Login successful",
      data: {
        user: { ...userData, role: userRole },
        token: signToken({ ...user, role: userRole }),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /users/profile ───────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, username, phone, location, avatar_url,
              auth_provider, is_email_verified, role, is_active, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    const row = result.rows[0];
    const userRole = row.role || resolveRole(row.email) || 'user';
    res.json({ message: "Success", data: { ...row, role: userRole } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PATCH /users/profile ─────────────────────────────────
const updateProfile = async (req, res) => {
  const profileInput = req.file ? { ...req.body, avatar: true } : req.body;
  const { error } = updateProfileSchema.validate(profileInput);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const { name, phone, location } = req.body;
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const fields = [];
    const values = [];
    let i = 1;

    if (name) {
      fields.push(`name = $${i++}`);
      values.push(name);
    }
    if (phone !== undefined) {
      fields.push(`phone = $${i++}`);
      values.push(phone);
    }
    if (location !== undefined) {
      fields.push(`location = $${i++}`);
      values.push(location);
    }
    if (avatarUrl) {
      fields.push(`avatar_url = $${i++}`);
      values.push(avatarUrl);
    }
    fields.push("updated_at = NOW()");
    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${i}
       RETURNING id, name, email, phone, location, avatar_url, auth_provider, role, updated_at`,
      values
    );
    res.json({ message: "Profile updated", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /auth/forgot-password ───────────────────────────
const forgotPassword = async (req, res) => {
  const { error } = forgotPasswordSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const { email } = req.body;
    const result = await pool.query(
      "SELECT id, name FROM users WHERE email = $1",
      [email]
    );

    // Always return 200 to prevent email enumeration
    if (result.rows.length === 0)
      return res.json({
        message: "If this email exists, a reset link has been sent.",
      });

    const user = result.rows[0];

    // Invalidate previous tokens
    await pool.query(
      "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE",
      [user.id]
    );

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expiresAt]
    );

    await sendResetPasswordEmail(email, user.name, token);

    res.json({ message: "If this email exists, a reset link has been sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /auth/reset-password ────────────────────────────
const resetPassword = async (req, res) => {
  const { error } = resetPasswordSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const { token, new_password } = req.body;

    const result = await pool.query(
      `SELECT * FROM password_reset_tokens
       WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ error: "Invalid or expired reset token." });

    const resetToken = result.rows[0];
    const hashed = await bcrypt.hash(new_password, 10);

    // Update password
    await pool.query(
      "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
      [hashed, resetToken.user_id]
    );

    // Mark token as used
    await pool.query(
      "UPDATE password_reset_tokens SET used = TRUE WHERE id = $1",
      [resetToken.id]
    );

    res.json({
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PATCH /users/update-password ────────────────────────
const updatePassword = async (req, res) => {
  const { error } = updatePasswordSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const { current_password, new_password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [
      req.user.id,
    ]);
    const user = result.rows[0];

    if (!user.password)
      return res
        .status(400)
        .json({ error: "Google accounts cannot change password here." });

    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid)
      return res.status(401).json({ error: "Current password is incorrect." });

    if (await bcrypt.compare(new_password, user.password))
      return res.status(400).json({
        error: "New password must be different from the current one.",
      });

    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query(
      "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
      [hashed, req.user.id]
    );

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PATCH /users/update-email ────────────────────────────
const updateEmail = async (req, res) => {
  const { error } = updateEmailSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const { new_email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [
      req.user.id,
    ]);
    const user = result.rows[0];

    if (!user.password)
      return res
        .status(400)
        .json({ error: "Google accounts cannot change email here." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: "Password is incorrect." });

    if (new_email === user.email)
      return res
        .status(400)
        .json({ error: "New email must be different from the current one." });

    const taken = await pool.query("SELECT id FROM users WHERE email = $1", [
      new_email,
    ]);
    if (taken.rows.length > 0)
      return res.status(409).json({ error: "This email is already in use." });

    const oldEmail = user.email;
    await pool.query(
      "UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2",
      [new_email, req.user.id]
    );

    // Notify old email
    await sendEmailUpdateNotification(oldEmail, new_email, user.name).catch(
      () => {}
    );

    // Issue new token with updated email
    const newToken = signToken({ id: user.id, email: new_email });

    res.json({
      message: "Email updated successfully.",
      data: { token: newToken },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Google OAuth callback handler ───────────────────────
const googleCallback = (req, res) => {
  try {
    const token = signToken(req.user);
    // Redirect to frontend with token in query param
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    // Use URL fragment so token is never sent to server or logged
    res.redirect(`${frontendUrl}/auth/google/success#token=${token}`);
  } catch (err) {
    console.error(err);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/auth/google/error`);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  updatePassword,
  updateEmail,
  googleCallback,
};
