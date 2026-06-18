const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const {
  createUserPlantSchema,
  updateUserPlantSchema,
  createDiagnosisHistorySchema,
} = require('../validators/appValidator');
const { analyzeDoctorImage } = require('../services/geminiDiagnosisService');

const formatDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string') return value.includes('T') ? value.split('T')[0] : value;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
};

const parseJsonField = (value, fallback) => {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }
  return value;
};

// ─── Helper: map DB row → Frontend TrackedPlant ───────────────
const mapPlantRow = (row) => ({
  id:                       row.id,
  name:                     row.name,
  image:                    row.image_url || '',
  diagnosis:                parseJsonField(row.diagnosis_json, null),
  progressLog:              Array.isArray(parseJsonField(row.progress_log_json, [])) ? parseJsonField(row.progress_log_json, []) : [],
  lastCheckDate:            formatDateOnly(row.last_check_date),
  recoveryProgressPercentage: parseFloat(row.recovery_progress_percent || 0),
  healthStatus:             row.health_status,
});

// ─── Helper: map DB row → Frontend DiagnosisHistoryEntry ─────
const mapDiagRow = (row) => ({
  id:        row.id,
  date:      formatDateOnly(row.date) || new Date().toISOString().split('T')[0],
  plantName: row.plant_name,
  image:     row.image_url || '',
  diagnosis: parseJsonField(row.diagnosis, null),
});

// ───────────────────────────────────────────────────────────────
// TRACKED PLANTS
// ───────────────────────────────────────────────────────────────

// ─── POST /my-plants ─────────────────────────────────────────
const createUserPlant = async (req, res) => {
  const { error } = createUserPlantSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const {
      name, species_name, image_url, health_status,
      recovery_progress_percent, last_check_date,
      diagnosis_json, progress_log_json,
    } = req.body;

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : (image_url || null);
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO user_tracked_plants
         (user_id, name, species_name, image_url, health_status,
          recovery_progress_percent, last_check_date, diagnosis_json, progress_log_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        req.user.id, name, species_name || null, imageUrl,
        health_status || 'healthy',
        recovery_progress_percent || 0,
        last_check_date || today,
        diagnosis_json ? JSON.stringify(diagnosis_json) : null,
        JSON.stringify(progress_log_json || []),
      ]
    );
    res.status(201).json({ message: 'Plant tracked successfully', data: mapPlantRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /my-plants ──────────────────────────────────────────
const getUserPlants = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_tracked_plants WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ message: 'Success', data: result.rows.map(mapPlantRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /my-plants/:id ──────────────────────────────────────
const getUserPlantById = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_tracked_plants WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Plant not found' });
    res.json({ message: 'Success', data: mapPlantRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── PATCH /my-plants/:id ────────────────────────────────────
const updateUserPlant = async (req, res) => {
  const { error } = updateUserPlantSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const existing = await pool.query(
      'SELECT id FROM user_tracked_plants WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Plant not found' });

    const fields = [];
    const values = [];
    let i = 1;

    const scalarFields = ['name', 'species_name', 'health_status', 'recovery_progress_percent', 'last_check_date'];
    for (const f of scalarFields) {
      if (req.body[f] !== undefined) {
        fields.push(`${f} = $${i++}`);
        values.push(req.body[f]);
      }
    }
    // Handle image – uploaded file takes priority
    const newImageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;
    if (newImageUrl !== undefined) { fields.push(`image_url = $${i++}`); values.push(newImageUrl); }

    if (req.body.diagnosis_json !== undefined) {
      fields.push(`diagnosis_json = $${i++}`);
      values.push(req.body.diagnosis_json ? JSON.stringify(req.body.diagnosis_json) : null);
    }
    if (req.body.progress_log_json !== undefined) {
      fields.push(`progress_log_json = $${i++}`);
      values.push(JSON.stringify(req.body.progress_log_json));
    }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    fields.push('updated_at = NOW()');
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE user_tracked_plants SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    res.json({ message: 'Plant updated', data: mapPlantRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /my-plants/:id ───────────────────────────────────
const deleteUserPlant = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM user_tracked_plants WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Plant not found' });
    res.json({ message: 'Plant deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ───────────────────────────────────────────────────────────────
// DIAGNOSIS HISTORY
// ───────────────────────────────────────────────────────────────

// ─── POST /plant-doctor/analyze ───────────────────────────────
const analyzePlantDoctor = async (req, res) => {
  const start = Date.now();
  const endpoint = '/plant-doctor/analyze';

  if (!req.file) {
    return res.status(400).json({ error: 'Plant image is required.' });
  }

  const imageUrl = `/uploads/${req.file.filename}`;

  try {
    const imageBuffer = await fs.promises.readFile(
      path.join(__dirname, '..', 'uploads', req.file.filename)
    );
    const diagnosis = await analyzeDoctorImage(
      imageBuffer,
      req.file.mimetype || 'image/jpeg',
      req.query.language || req.headers['accept-language'] || 'en'
    );

    await pool
      .query(
        `INSERT INTO ai_usage (user_id, endpoint, provider, tokens_used, latency_ms, cost_estimate, success)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.id, endpoint, 'gemini', 350, Date.now() - start, 0.0007, true]
      )
      .catch(() => {});

    res.json({
      message: 'Analysis complete',
      data: {
        diagnosis,
        image_url: imageUrl,
      },
    });
  } catch (err) {
    console.error(err);

    await pool
      .query(
        `INSERT INTO ai_usage (user_id, endpoint, provider, latency_ms, success)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, endpoint, 'gemini', Date.now() - start, false]
      )
      .catch(() => {});

    res.status(500).json({
      error: err.message || 'Could not analyze plant image.',
    });
  }
};

// ─── POST /diagnosis-history ─────────────────────────────────
const createDiagnosisHistory = async (req, res) => {
  const { error } = createDiagnosisHistorySchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const { plant_name, image_url, diagnosis, date } = req.body;
    const imgUrl = req.file ? `/uploads/${req.file.filename}` : (image_url || null);

    const result = await pool.query(
      `INSERT INTO user_diagnosis_history (user_id, plant_name, image_url, diagnosis, date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, plant_name || null, imgUrl, JSON.stringify(diagnosis), date || null]
    );
    res.status(201).json({ message: 'Diagnosis saved', data: mapDiagRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /diagnosis-history ───────────────────────────────────
const getDiagnosisHistory = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_diagnosis_history WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ message: 'Success', data: result.rows.map(mapDiagRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createUserPlant,
  getUserPlants,
  getUserPlantById,
  updateUserPlant,
  deleteUserPlant,
  analyzePlantDoctor,
  createDiagnosisHistory,
  getDiagnosisHistory,
};
