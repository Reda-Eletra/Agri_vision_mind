const pool = require('../config/database');
const { syncImportedNews } = require('../services/newsSyncService');

// ─── Helper: map DB row → API object ─────────────────────────
const mapRow = (row) => ({
  id:          row.id,
  title:       row.title,
  summary:     row.summary,
  content:     row.content || undefined,
  imageUrl:    row.image_url  || null,
  category:    row.category   || 'general',
  publishedAt: row.published_at,
  createdAt:   row.created_at,
  updatedAt:   row.updated_at,
  source:      row.source_name || undefined,
  url:         row.source_url || undefined,
  sourceUrl:   row.source_url || undefined,
  sourceArticleId: row.source_article_id || undefined,
  isImported:  Boolean(row.is_imported),
});

const parseDateFilter = (value, endOfDay = false) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  if (endOfDay) parsed.setHours(23, 59, 59, 999);
  else parsed.setHours(0, 0, 0, 0);
  return parsed;
};

// ─── GET /news ────────────────────────────────────────────────
const getNews = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 24));
    const offset = (page - 1) * limit;
    const source = String(req.query.source || '').trim();
    const dateFrom = parseDateFilter(req.query.dateFrom);
    const dateTo = parseDateFilter(req.query.dateTo, true);

    const conditions = ['is_visible = TRUE', 'deleted_at IS NULL'];
    const params = [];

    if (source) {
      params.push(source);
      conditions.push(`source_name = $${params.length}`);
    }

    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`published_at >= $${params.length}`);
    }

    if (dateTo) {
      params.push(dateTo);
      conditions.push(`published_at <= $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await pool.query(
      `SELECT id, title, summary, image_url, category, published_at, created_at, updated_at,
              source_name, source_url, source_article_id, is_imported
       FROM news
       ${whereClause}
       ORDER BY published_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const total = await pool.query(`SELECT COUNT(*) FROM news ${whereClause}`, params);
    const totalCount = parseInt(total.rows[0].count, 10);
    const sources = await pool.query(
      `SELECT DISTINCT source_name
       FROM news
       WHERE is_visible = TRUE AND deleted_at IS NULL
         AND source_name IS NOT NULL AND source_name <> ''
       ORDER BY source_name ASC`
    );

    res.json({
      message: 'Success',
      data: result.rows.map(mapRow),
      pagination: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) },
      filters: { sources: sources.rows.map((row) => row.source_name) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /news/:id ────────────────────────────────────────────
const getNewsById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM news
       WHERE id = $1 AND is_visible = TRUE AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Article not found' });
    res.json({ message: 'Success', data: mapRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAdminNews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT *
       FROM news
       ORDER BY published_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = await pool.query("SELECT COUNT(*) FROM news");

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

// ─── POST /admin/news ─────────────────────────────────────────
const createNews = async (req, res) => {
  try {
    const { title, summary, content, category } = req.body;

    if (!title?.trim() || !summary?.trim() || !content?.trim()) {
      return res.status(400).json({ error: 'title, summary, and content are required' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url || null);

    const result = await pool.query(
      `INSERT INTO news (title, summary, content, image_url, category, is_imported)
       VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING *`,
      [title.trim(), summary.trim(), content.trim(), imageUrl, category || 'general']
    );

    res.status(201).json({ message: 'Article created', data: mapRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /admin/news/:id ───────────────────────────────────
const deleteNews = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE news
       SET deleted_at = NOW(), is_visible = FALSE, updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Article not found' });
    res.json({ message: 'Article deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /admin/news/sync ────────────────────────────────────
const syncNews = async (_req, res) => {
  try {
    const result = await syncImportedNews();
    res.json({ message: 'News sync completed', data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'News sync failed' });
  }
};

module.exports = {
  getNews,
  getNewsById,
  getAdminNews,
  createNews,
  deleteNews,
  syncNews,
};
