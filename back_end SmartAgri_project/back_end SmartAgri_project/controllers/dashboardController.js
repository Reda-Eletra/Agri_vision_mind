const pool = require('../config/database');

// GET /dashboard/overview
const getOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    const farms = await pool.query('SELECT COUNT(*) FROM farms WHERE user_id = $1', [userId]);

    // tracked_plants has no health_status column; derive it from recovery_progress_percent
    const plants = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN tp.recovery_progress_percent < 30  THEN 1 ELSE 0 END) AS infected,
         SUM(CASE WHEN tp.recovery_progress_percent >= 80 THEN 1 ELSE 0 END) AS healthy,
         SUM(CASE WHEN tp.recovery_progress_percent >= 30 AND tp.recovery_progress_percent < 80 THEN 1 ELSE 0 END) AS recovering,
         AVG(tp.recovery_progress_percent) AS avg_recovery
       FROM tracked_plants tp
       JOIN farm_cycles fc ON tp.farm_cycle_id = fc.id
       JOIN farms f ON fc.farm_id = f.id
       WHERE f.user_id = $1`,
      [userId]
    );

    // schedule_tasks uses farm_cycle_id, completed (bool), date — not cycle_id / status / due_date
    const overdueAlerts = await pool.query(
      `SELECT COUNT(*) FROM schedule_tasks st
       JOIN farm_cycles fc ON st.farm_cycle_id = fc.id
       JOIN farms f ON fc.farm_id = f.id
       WHERE f.user_id = $1 AND st.completed = FALSE AND st.date < CURRENT_DATE`,
      [userId]
    );

    const p = plants.rows[0];
    const avgRecovery = p.avg_recovery ? Number.parseFloat(p.avg_recovery) : 0;

    res.json({
      message: 'Success',
      data: {
        total_farms: Number.parseInt(farms.rows[0].count, 10) || 0,
        total_plants: Number.parseInt(p.total, 10) || 0,
        infected_plants: Number.parseInt(p.infected, 10) || 0,
        healthy_plants: Number.parseInt(p.healthy, 10) || 0,
        recovering_plants: Number.parseInt(p.recovering, 10) || 0,
        avg_recovery_percent: Math.round(avgRecovery * 100) / 100,
        overdue_tasks: Number.parseInt(overdueAlerts.rows[0].count, 10) || 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /dashboard/recent-scans
const getRecentScans = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dh.*, tp.species_name, f.name AS farm_name
       FROM diagnosis_history dh
       JOIN tracked_plants tp ON dh.plant_id = tp.id
       JOIN farm_cycles fc ON tp.farm_cycle_id = fc.id
       JOIN farms f ON fc.farm_id = f.id
       WHERE dh.user_id = $1
       ORDER BY dh.created_at DESC LIMIT 10`,
      [req.user.id]
    );
    res.json({ message: 'Success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /dashboard/upcoming-tasks
const getUpcomingTasks = async (req, res) => {
  try {
    // farm_cycles has no `name` column; use `crop` as the cycle label
    // schedule_tasks uses `farm_cycle_id`, `date`, `completed` — not cycle_id/due_date/status
    const result = await pool.query(
      `SELECT st.*, fc.crop AS cycle_name, f.name AS farm_name
       FROM schedule_tasks st
       JOIN farm_cycles fc ON st.farm_cycle_id = fc.id
       JOIN farms f ON fc.farm_id = f.id
       WHERE f.user_id = $1 AND st.completed = FALSE AND st.date >= CURRENT_DATE
       ORDER BY st.date ASC LIMIT 10`,
      [req.user.id]
    );
    res.json({ message: 'Success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /dashboard/disease-distribution
const getDiseaseDistribution = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         dh.disease_name,
         COUNT(*) AS count,
         AVG(dh.confidence) * 100 AS avg_confidence_pct,
         tp.species_name
       FROM diagnosis_history dh
       JOIN tracked_plants tp ON dh.plant_id = tp.id
       JOIN farm_cycles fc ON tp.farm_cycle_id = fc.id
       JOIN farms f ON fc.farm_id = f.id
       WHERE f.user_id = $1 AND dh.disease_name != 'Healthy'
       GROUP BY dh.disease_name, tp.species_name
      ORDER BY count DESC LIMIT 10`,
      [req.user.id]
    );

    const normalizedRows = result.rows.map((row) => ({
      ...row,
      avg_confidence_pct: row.avg_confidence_pct
        ? Math.round(Number.parseFloat(row.avg_confidence_pct) * 10) / 10
        : 0,
    }));

    res.json({ message: 'Success', data: normalizedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /dashboard/farm-expenses
const getFarmExpenses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         f.name AS farm_name,
         t.category,
         SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) AS total_income,
         SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS total_expenses,
         SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) AS net_profit
       FROM transactions t
       JOIN farms f ON t.farm_id = f.id
       WHERE f.user_id = $1
       GROUP BY f.name, t.category
       ORDER BY f.name`,
      [req.user.id]
    );
    res.json({ message: 'Success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /dashboard/plant-health
const getPlantHealthTrend = async (req, res) => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const result = await pool.query(
      `SELECT
         DATE_TRUNC('week', pl.logged_at) AS week,
         AVG(pl.recovery_percent) AS avg_recovery,
         COUNT(*) AS log_count
       FROM progress_logs pl
       JOIN tracked_plants tp ON pl.plant_id = tp.id
       JOIN farm_cycles fc ON tp.farm_cycle_id = fc.id
       JOIN farms f ON fc.farm_id = f.id
       WHERE f.user_id = $1 AND pl.logged_at >= $2
       GROUP BY week
       ORDER BY week ASC`,
      [req.user.id, threeMonthsAgo]
    );

    // Most affected species
    const affected = await pool.query(
      `SELECT tp.species_name, COUNT(*) AS infection_count
       FROM diagnosis_history dh
       JOIN tracked_plants tp ON dh.plant_id = tp.id
       JOIN farm_cycles fc ON tp.farm_cycle_id = fc.id
       JOIN farms f ON fc.farm_id = f.id
       WHERE f.user_id = $1 AND dh.disease_name != 'Healthy'
       GROUP BY tp.species_name
      ORDER BY infection_count DESC LIMIT 5`,
      [req.user.id]
    );

    const healthTrend = result.rows.map((row) => ({
      ...row,
      avg_recovery: row.avg_recovery
        ? Math.round(Number.parseFloat(row.avg_recovery) * 100) / 100
        : 0,
    }));

    res.json({
      message: 'Success',
      data: {
        health_trend: healthTrend,
        most_affected_species: affected.rows,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getOverview,
  getRecentScans,
  getUpcomingTasks,
  getDiseaseDistribution,
  getFarmExpenses,
  getPlantHealthTrend,
};
