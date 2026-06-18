const pool = require('../config/database');
const { transactionSchema } = require('../validators/appValidator');

// ─── Helper: map DB row → Frontend Transaction object ─────────
const mapTxRow = (row) => ({
  id:          row.id,
  date:        row.date ? row.date.toISOString().split('T')[0] : null,
  amount:      parseFloat(row.amount),
  type:        row.type,
  category:    row.category,
  description: row.description,
  farmId:      row.farm_id || undefined,
});

// ─── POST /farms/:id/transactions ────────────────────────────
const createTransaction = async (req, res) => {
  const { error } = transactionSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const farm = await pool.query(
      'SELECT id FROM farms WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (farm.rows.length === 0) return res.status(404).json({ error: 'Farm not found' });

    const { amount, type, category, description, date } = req.body;
    const result = await pool.query(
      `INSERT INTO transactions (farm_id, user_id, amount, type, category, description, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, req.user.id, amount, type, category, description, date]
    );
    res.status(201).json({ message: 'Transaction recorded', data: mapTxRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /farms/:id/transactions ─────────────────────────────
const getTransactions = async (req, res) => {
  try {
    const farm = await pool.query(
      'SELECT id FROM farms WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (farm.rows.length === 0) return res.status(404).json({ error: 'Farm not found' });

    const { type, from, to } = req.query;
    let query = 'SELECT * FROM transactions WHERE farm_id = $1';
    const values = [req.params.id];
    let i = 2;

    if (type) { query += ` AND type = $${i++}`; values.push(type); }
    if (from) { query += ` AND date >= $${i++}`; values.push(from); }
    if (to)   { query += ` AND date <= $${i++}`; values.push(to); }
    query += ' ORDER BY date DESC';

    const result = await pool.query(query, values);
    const summary = await _buildSummary(req.params.id, 'farm_id');

    res.json({
      message: 'Success',
      data: result.rows.map(mapTxRow),
      summary,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /transactions (all user transactions) ────────────────
const getAllTransactions = async (req, res) => {
  try {
    const { type, from, to } = req.query;
    let query = 'SELECT * FROM transactions WHERE user_id = $1';
    const values = [req.user.id];
    let i = 2;

    if (type) { query += ` AND type = $${i++}`; values.push(type); }
    if (from) { query += ` AND date >= $${i++}`; values.push(from); }
    if (to)   { query += ` AND date <= $${i++}`; values.push(to); }
    query += ' ORDER BY date DESC';

    const result = await pool.query(query, values);
    const summary = await _buildUserSummary(req.user.id);

    res.json({
      message: 'Success',
      data: result.rows.map(mapTxRow),
      summary,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /transactions (general – farm_id optional) ─────────
const createGeneralTransaction = async (req, res) => {
  const { error } = transactionSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const { amount, type, category, description, date, farm_id, farmId } = req.body;
    const resolvedFarmId = farm_id || farmId || null;

    // If a farm_id is supplied, verify ownership
    if (resolvedFarmId) {
      const farm = await pool.query(
        'SELECT id FROM farms WHERE id = $1 AND user_id = $2',
        [resolvedFarmId, req.user.id]
      );
      if (farm.rows.length === 0) return res.status(404).json({ error: 'Farm not found' });
    }

    const result = await pool.query(
      `INSERT INTO transactions (farm_id, user_id, amount, type, category, description, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [resolvedFarmId, req.user.id, amount, type, category, description, date]
    );
    res.status(201).json({ message: 'Transaction recorded', data: mapTxRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /transactions/:id ─────────────────────────────────
const deleteTransaction = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Internal helpers ─────────────────────────────────────────
const _buildSummary = async (id, column) => {
  const s = await pool.query(
    `SELECT
       SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS total_income,
       SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expenses
     FROM transactions WHERE ${column} = $1`,
    [id]
  );
  const r = s.rows[0];
  const income   = parseFloat(r.total_income   || 0);
  const expenses = parseFloat(r.total_expenses || 0);
  return { total_income: income, total_expenses: expenses, net_profit: income - expenses };
};

const _buildUserSummary = async (userId) => {
  const s = await pool.query(
    `SELECT
       SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS total_income,
       SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expenses
     FROM transactions WHERE user_id = $1`,
    [userId]
  );
  const r = s.rows[0];
  const income   = parseFloat(r.total_income   || 0);
  const expenses = parseFloat(r.total_expenses || 0);
  return { total_income: income, total_expenses: expenses, net_profit: income - expenses };
};

module.exports = {
  createTransaction,
  getTransactions,
  getAllTransactions,
  createGeneralTransaction,
  deleteTransaction,
};
