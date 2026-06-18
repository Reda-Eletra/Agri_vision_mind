const pool   = require('../config/database');
const bcrypt = require('bcryptjs');

// ─── Helper: compute admin email list ─────────────────────────
const getAdminEmails = () =>
  (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

// ─── Middleware: require admin role ──────────────────────────
const requireAdmin = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Unauthorized' });

    const adminEmails = getAdminEmails();
    const isAdmin =
      result.rows[0].role === 'admin' ||
      adminEmails.includes(result.rows[0].email.toLowerCase());

    if (!isAdmin) return res.status(403).json({ error: 'Admin access required.' });
    req.adminUser = result.rows[0];
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/stats ─────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const users  = await pool.query('SELECT COUNT(*) FROM users');
    const farms  = await pool.query('SELECT COUNT(*) FROM farms');
    // tracked_plants is the actual table used by cycle-based plant tracking
    const plants = await pool.query('SELECT COUNT(*) FROM tracked_plants');

    res.json({
      message: 'Success',
      data: {
        totalUsers:  parseInt(users.rows[0].count,  10) || 0,
        totalFarms:  parseInt(farms.rows[0].count,  10) || 0,
        totalPlants: parseInt(plants.rows[0].count, 10) || 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/users ─────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    // Use LEFT JOINs + GROUP BY instead of correlated subqueries for pg-mem compatibility
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.auth_provider, u.created_at,
              COALESCE(f.farm_count, 0)::int AS farm_count,
              COALESCE(dh.diagnosis_count, 0)::int AS diagnosis_count
       FROM users u
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int AS farm_count
         FROM farms
         GROUP BY user_id
       ) f ON f.user_id = u.id
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int AS diagnosis_count
         FROM diagnosis_history
         GROUP BY user_id
       ) dh ON dh.user_id = u.id
       ORDER BY u.created_at DESC`
    );

    const adminEmails = getAdminEmails();

    const users = result.rows.map((u) => ({
      id:             u.id,
      name:           u.name,
      email:          u.email,
      profilePicture: u.avatar_url || '',
      role:           adminEmails.includes(u.email.toLowerCase()) ? 'admin' : 'user',
      createdAt:      u.created_at,
      farmCount:      u.farm_count      || 0,
      diagnosisCount: u.diagnosis_count || 0,
    }));

    res.json({ message: 'Success', data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── PATCH /admin/users/:id ───────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const setClauses = [];
    const values     = [];
    let   idx        = 1;

    if (name     !== undefined) { setClauses.push(`name = $${idx++}`);     values.push(name.trim()); }
    if (email    !== undefined) { setClauses.push(`email = $${idx++}`);    values.push(email.trim().toLowerCase()); }
    if (password !== undefined && password !== '') {
      const hashed = await bcrypt.hash(password, 10);
      setClauses.push(`password = $${idx++}`);
      values.push(hashed);
    }

    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${idx}
       RETURNING id, name, email, avatar_url, created_at`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const adminEmails = getAdminEmails();
    const u = result.rows[0];
    res.json({
      message: 'User updated',
      data: {
        id:             u.id,
        name:           u.name,
        email:          u.email,
        profilePicture: u.avatar_url || '',
        role:           adminEmails.includes(u.email.toLowerCase()) ? 'admin' : 'user',
        createdAt:      u.created_at,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /admin/users/:id ──────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const adminEmails = getAdminEmails();

    const target = await pool.query('SELECT email FROM users WHERE id = $1', [req.params.id]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (adminEmails.includes(target.rows[0].email.toLowerCase())) {
      return res.status(403).json({ error: 'Cannot delete an admin account.' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/users/:id/diagnoses ───────────────────────────
// Merges both diagnosis tables:
//   diagnosis_history        — farm-cycle plant scans (POST /plants/:id/scan)
//   user_diagnosis_history   — Plant Doctor free scans (POST /diagnosis-history)
const getUserDiagnoses = async (req, res) => {
  try {
    const [cycleScans, doctorScans] = await Promise.all([
      pool.query(
        `SELECT dh.id, dh.created_at AS date, dh.image_url,
                dh.disease_name, dh.confidence, dh.severity, dh.recommendations,
                tp.species_name AS plant_name,
                'farm_scan' AS source
         FROM diagnosis_history dh
         LEFT JOIN tracked_plants tp ON dh.plant_id = tp.id
         WHERE dh.user_id = $1
         ORDER BY dh.created_at DESC`,
        [req.params.id]
      ),
      pool.query(
        `SELECT id, created_at AS date, image_url,
                plant_name AS disease_name, NULL::float AS confidence,
                NULL AS severity,
                diagnosis::text AS recommendations,
                plant_name,
                'plant_doctor' AS source
         FROM user_diagnosis_history
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [req.params.id]
      ),
    ]);

    // Merge and sort newest-first
    const all = [...cycleScans.rows, ...doctorScans.rows].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    res.json({ message: 'Success', data: all });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /admin/posts ─────────────────────────────────────────
const getAllPosts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.title, p.body, p.category, p.image_url, p.likes_count,
              p.is_visible, p.deleted_at, p.created_at, u.name AS author_name
       FROM posts p JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC`
    );
    res.json({ message: 'Success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /admin/posts/:id ──────────────────────────────────
const adminDeletePost = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE posts
       SET deleted_at = NOW(), is_visible = FALSE, updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const slugifyName = (name = '') => {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'plant-guide';
};

const getAdminGrowthGuides = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    // Search filter
    if (req.query.search) {
      params.push(`%${req.query.search.trim()}%`);
      conditions.push(`(name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR scientific_name ILIKE $${params.length})`);
    }

    // Category filter
    if (req.query.category) {
      params.push(req.query.category.trim());
      conditions.push(`category = $${params.length}`);
    }

    // Soft delete / trash filter
    if (req.query.trash === 'true') {
      conditions.push('deleted_at IS NOT NULL');
    } else {
      conditions.push('deleted_at IS NULL');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM growth_guides ${whereClause}`;
    const dataQuery = `
      SELECT * FROM growth_guides
      ${whereClause}
      ORDER BY name_en ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countRes = await pool.query(countQuery, params);
    const dataRes = await pool.query(dataQuery, [...params, limit, offset]);

    res.json({
      message: 'Success',
      data: dataRes.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countRes.rows[0].count, 10),
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const createAdminGrowthGuide = async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const {
      name_en, name_ar, scientific_name, category, summary_en, summary_ar,
      description_en, description_ar, image_url, sunlight_en, sunlight_ar,
      soil_en, soil_ar, watering_en, watering_ar, planting_en, planting_ar,
      sowing_en, sowing_ar, spacing_en, spacing_ar, care_en, care_ar,
      harvesting_en, harvesting_ar, common_problems_en, common_problems_ar,
      pests_en, pests_ar, diseases_en, diseases_ar, additional_details_json
    } = req.body;

    if (!name_en) {
      return res.status(400).json({ error: 'English name is required' });
    }

    const id = uuidv4();
    const slug = slugifyName(name_en);

    const params = [
      id, slug, name_en, name_ar || null, scientific_name || null, category || 'other',
      summary_en || null, summary_ar || null, description_en || null, description_ar || null,
      image_url || null, 'Manual Admin Input', null, `manual-${id}`,
      sunlight_en || null, sunlight_ar || null, soil_en || null, soil_ar || null,
      watering_en || null, watering_ar || null, planting_en || null, planting_ar || null,
      sowing_en || null, sowing_ar || null, spacing_en || null, spacing_ar || null,
      care_en || null, care_ar || null, harvesting_en || null, harvesting_ar || null,
      common_problems_en || null, common_problems_ar || null, pests_en || null, pests_ar || null,
      diseases_en || null, diseases_ar || null, JSON.stringify(additional_details_json || {}), 'en'
    ];

    await pool.query(`
      INSERT INTO growth_guides (
        id, slug, name_en, name_ar, scientific_name, category, summary_en, summary_ar,
        description_en, description_ar, image_url, source_name, source_url, canonical_url,
        sunlight_en, sunlight_ar, soil_en, soil_ar, watering_en, watering_ar,
        planting_en, planting_ar, sowing_en, sowing_ar, spacing_en, spacing_ar,
        care_en, care_ar, harvesting_en, harvesting_ar, common_problems_en, common_problems_ar,
        pests_en, pests_ar, diseases_en, diseases_ar, additional_details_json, language,
        is_active, is_visible, deleted_at, last_synced_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
        TRUE, TRUE, NULL, NOW()
      )
    `, params);

    res.status(201).json({ message: 'Growth guide created successfully', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating growth guide' });
  }
};

const updateAdminGrowthGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    const setClauses = [];
    const values = [];
    let idx = 1;

    const updatableColumns = [
      'name_en', 'name_ar', 'scientific_name', 'category', 'summary_en', 'summary_ar',
      'description_en', 'description_ar', 'image_url', 'sunlight_en', 'sunlight_ar',
      'soil_en', 'soil_ar', 'watering_en', 'watering_ar', 'planting_en', 'planting_ar',
      'sowing_en', 'sowing_ar', 'spacing_en', 'spacing_ar', 'care_en', 'care_ar',
      'harvesting_en', 'harvesting_ar', 'common_problems_en', 'common_problems_ar',
      'pests_en', 'pests_ar', 'diseases_en', 'diseases_ar', 'is_visible'
    ];

    for (const col of updatableColumns) {
      if (fields[col] !== undefined) {
        setClauses.push(`${col} = $${idx++}`);
        values.push(fields[col]);
      }
    }

    if (fields.additional_details_json !== undefined) {
      setClauses.push(`additional_details_json = $${idx++}`);
      values.push(JSON.stringify(fields.additional_details_json));
    }

    if (fields.restore === true) {
      setClauses.push(`deleted_at = NULL`);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE growth_guides SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} RETURNING id`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Growth guide not found' });
    }

    res.json({ message: 'Growth guide updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating growth guide' });
  }
};

const deleteAdminGrowthGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';

    let result;
    if (force) {
      result = await pool.query('DELETE FROM growth_guides WHERE id = $1 RETURNING id', [id]);
    } else {
      result = await pool.query(
        'UPDATE growth_guides SET deleted_at = NOW(), is_visible = FALSE WHERE id = $1 RETURNING id',
        [id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Growth guide not found' });
    }

    res.json({ message: force ? 'Growth guide permanently deleted' : 'Growth guide moved to Trash' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting growth guide' });
  }
};

const toggleVisibilityAdminGrowthGuide = async (req, res) => {
  try {
    const { id } = req.params;

    const guideRes = await pool.query('SELECT is_visible FROM growth_guides WHERE id = $1', [id]);
    if (guideRes.rows.length === 0) {
      return res.status(404).json({ error: 'Growth guide not found' });
    }

    const newVisibility = !guideRes.rows[0].is_visible;
    await pool.query('UPDATE growth_guides SET is_visible = $1, updated_at = NOW() WHERE id = $2', [newVisibility, id]);

    res.json({ message: `Visibility updated to ${newVisibility ? 'visible' : 'hidden'}`, is_visible: newVisibility });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error toggling visibility' });
  }
};

const { syncImportedGrowthGuides, getScrapeSyncStatus } = require('../services/growthGuideSyncService');

const syncAdminGrowthGuides = async (req, res) => {
  try {
    const status = getScrapeSyncStatus();
    if (status.isSyncing) {
      return res.status(400).json({ error: 'A synchronization task is already in progress' });
    }

    syncImportedGrowthGuides().catch(err => {
      console.error('[admin-sync-trigger] Background sync error:', err);
    });

    res.json({ message: 'Synchronization triggered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error triggering synchronization' });
  }
};

const getAdminGrowthGuidesSyncStatus = async (req, res) => {
  try {
    const status = getScrapeSyncStatus();

    const countRes = await pool.query('SELECT COUNT(*) FROM growth_guides WHERE deleted_at IS NULL');
    const totalPlantsInDb = parseInt(countRes.rows[0].count, 10);

    const logsRes = await pool.query(
      "SELECT * FROM sync_logs WHERE section = 'growth-guides' ORDER BY start_time DESC LIMIT 15"
    );

    res.json({
      message: 'Success',
      data: {
        ...status,
        totalPlantsInDb,
        logs: logsRes.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error getting sync status' });
  }
};

module.exports = {
  requireAdmin,
  getStats,
  getUsers,
  updateUser,
  deleteUser,
  getUserDiagnoses,
  getAllPosts,
  adminDeletePost,
  getAdminGrowthGuides,
  createAdminGrowthGuide,
  updateAdminGrowthGuide,
  deleteAdminGrowthGuide,
  toggleVisibilityAdminGrowthGuide,
  syncAdminGrowthGuides,
  getAdminGrowthGuidesSyncStatus,
};
