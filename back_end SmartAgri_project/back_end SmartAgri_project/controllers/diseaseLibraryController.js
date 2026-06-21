const pool = require('../config/database');
const { syncImportedDiseaseLibrary } = require('../services/diseaseLibrarySyncService');

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeArrayInput = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((entry) => String(entry).trim()).filter(Boolean);
  return String(input)
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const mapRow = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  symptoms: parseJsonArray(row.symptoms_json),
  treatment: parseJsonArray(row.treatment_json),
  prevention: parseJsonArray(row.prevention_json),
  imageUrl: row.image_url || null,
  category: row.category || 'plant-disease',
  hosts: parseJsonArray(row.hosts_json),
  scientificName: row.scientific_name || undefined,
  language: row.language || 'en',
  source: row.source_name || undefined,
  sourceName: row.source_name || undefined,
  sourceUrl: row.source_url || undefined,
  sourceArticleId: row.source_article_id || undefined,
  isImported: Boolean(row.is_imported),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizeLang = (value) => (value === 'ar' ? 'ar' : 'en');
const fallbackLang = (value) => (value === 'ar' ? 'en' : 'ar');

const getDiseaseLibrary = async (req, res) => {
  try {
    const lang = normalizeLang(req.query.lang);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 1000));
    const offset = (page - 1) * limit;

    const loadPage = (language) => pool.query(
      `SELECT *
       FROM disease_library
       WHERE language = $1 AND is_visible = TRUE AND deleted_at IS NULL
       ORDER BY source_name ASC, name ASC
       LIMIT $2 OFFSET $3`,
      [language, limit, offset]
    );
    const loadTotal = (language) => pool.query(
      `SELECT COUNT(*) FROM disease_library
       WHERE language = $1 AND is_visible = TRUE AND deleted_at IS NULL`,
      [language]
    );
    let result = await loadPage(lang);
    let total = await loadTotal(lang);
    let resolvedLang = lang;

    if (result.rows.length === 0) {
      const fallback = fallbackLang(lang);
      result = await loadPage(fallback);
      total = await loadTotal(fallback);
      resolvedLang = fallback;
    }

    res.json({
      message: 'Success',
      data: result.rows.map(mapRow),
      pagination: { page, limit, total: parseInt(total.rows[0].count, 10), language: resolvedLang },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDiseaseById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM disease_library
       WHERE id = $1 AND is_visible = TRUE AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Disease entry not found' });
    res.json({ message: 'Success', data: mapRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAdminDiseaseLibrary = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 1000));
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT *
       FROM disease_library
       ORDER BY source_name ASC, name ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = await pool.query("SELECT COUNT(*) FROM disease_library");

    res.json({
      message: "Success",
      data: result.rows.map((row) => ({
        ...mapRow(row),
        isVisible: row.is_visible,
        deletedAt: row.deleted_at,
      })),
      pagination: { page, limit, total: parseInt(total.rows[0].count, 10) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const createAdminDisease = async (req, res) => {
  try {
    const diseaseName = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    if (!diseaseName || !description) {
      return res.status(400).json({ error: 'Disease name and description are required' });
    }

    const insertResult = await pool.query(
      `INSERT INTO disease_library (
         name, description, symptoms_json, treatment_json, prevention_json,
         image_url, category, hosts_json, scientific_name, language,
         source_name, source_article_id, is_imported, is_visible
       )
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7, $8::jsonb, $9, $10,
               'Manual Admin Input', $11, FALSE, TRUE)
       RETURNING *`,
      [
        diseaseName,
        description,
        JSON.stringify(normalizeArrayInput(req.body.symptoms)),
        JSON.stringify(normalizeArrayInput(req.body.treatment)),
        JSON.stringify(normalizeArrayInput(req.body.prevention)),
        req.body.imageUrl || req.body.image_url || null,
        req.body.category || 'plant-disease',
        JSON.stringify(normalizeArrayInput(req.body.hosts)),
        req.body.scientificName || req.body.scientific_name || null,
        req.body.language === 'en' ? 'en' : 'ar',
        `manual-${Date.now()}`,
      ]
    );

    res.status(201).json({ message: 'Disease entry created', data: mapRow(insertResult.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteAdminDisease = async (req, res) => {
  try {
    const deleteResult = await pool.query(
      `UPDATE disease_library
       SET deleted_at = NOW(), is_visible = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [req.params.id]
    );
    if (deleteResult.rows.length === 0) return res.status(404).json({ error: 'Disease entry not found' });
    res.json({ message: 'Disease entry deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const syncDiseaseLibrary = async (_req, res) => {
  try {
    const result = await syncImportedDiseaseLibrary();
    res.json({ message: 'Disease library sync completed', data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Disease library sync failed' });
  }
};

module.exports = {
  getDiseaseLibrary,
  getDiseaseById,
  getAdminDiseaseLibrary,
  createAdminDisease,
  deleteAdminDisease,
  syncDiseaseLibrary,
};
