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
  syncDiseaseLibrary,
};
