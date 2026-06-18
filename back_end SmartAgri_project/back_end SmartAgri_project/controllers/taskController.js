const pool = require("../config/database");
const {
  createTaskSchema,
  updateTaskSchema,
} = require("../validators/appValidator");

// POST /cycles/:id/tasks
const createTask = async (req, res) => {
  const { error } = createTaskSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const cycle = await pool.query(
      `SELECT fc.id FROM farm_cycles fc JOIN farms f ON fc.farm_id = f.id
       WHERE fc.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (cycle.rows.length === 0)
      return res.status(404).json({ error: "Cycle not found" });

    const { task_name, task_type, date } = req.body;

    if (!task_name)
      return res.status(400).json({ error: "Task name is required" });
    if (!date) return res.status(400).json({ error: "Date is required" });

    const result = await pool.query(
      `INSERT INTO schedule_tasks (farm_cycle_id, task_name, task_type, date, completed)
       VALUES ($1, $2, $3, $4, false) RETURNING *`,
      [req.params.id, task_name, task_type || null, date]
    );
    res
      .status(201)
      .json({ message: "Task created successfully", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /cycles/:id/tasks
const getTasks = async (req, res) => {
  try {
    const cycle = await pool.query(
      `SELECT fc.id FROM farm_cycles fc JOIN farms f ON fc.farm_id = f.id
       WHERE fc.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (cycle.rows.length === 0)
      return res.status(404).json({ error: "Cycle not found" });

    const result = await pool.query(
      "SELECT * FROM schedule_tasks WHERE farm_cycle_id = $1 ORDER BY date ASC",
      [req.params.id]
    );
    res.json({ message: "Success", data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /tasks/:id
const updateTask = async (req, res) => {
  const { error } = updateTaskSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const task = await pool.query(
      `SELECT st.id FROM schedule_tasks st
       JOIN farm_cycles fc ON st.farm_cycle_id = fc.id
       JOIN farms f ON fc.farm_id = f.id
       WHERE st.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (task.rows.length === 0)
      return res.status(404).json({ error: "Task not found" });

    const { task_name, task_type, date, completed } = req.body;
    const fields = [];
    const values = [];
    let i = 1;

    if (task_name !== undefined) {
      fields.push(`task_name = $${i++}`);
      values.push(task_name);
    }
    if (task_type !== undefined) {
      fields.push(`task_type = $${i++}`);
      values.push(task_type);
    }
    if (date !== undefined) {
      fields.push(`date = $${i++}`);
      values.push(date);
    }
    if (completed !== undefined) {
      fields.push(`completed = $${i++}`);
      values.push(completed);
    }

    if (fields.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    fields.push("updated_at = NOW()");
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE schedule_tasks SET ${fields.join(
        ", "
      )} WHERE id = $${i} RETURNING *`,
      values
    );
    res.json({ message: "Task updated", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /tasks/:id
const deleteTask = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM schedule_tasks st
       USING farm_cycles fc, farms f
       WHERE st.id = $1 AND st.farm_cycle_id = fc.id AND fc.farm_id = f.id AND f.user_id = $2
       RETURNING st.id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createTask, getTasks, updateTask, deleteTask };
