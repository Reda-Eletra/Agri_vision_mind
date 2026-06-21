const pool = require("../config/database");

const contactMessageRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  subject: row.subject,
  message: row.message,
  status: row.status,
  createdAt: row.created_at,
  readAt: row.read_at,
});

const createContactMessage = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const subject = String(req.body.subject || "").trim();
    const message = String(req.body.message || "").trim();

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Name, email, subject, and message are required." });
    }

    const result = await pool.query(
      `INSERT INTO contact_messages (name, email, subject, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, email, subject, message]
    );

    res.status(201).json({ message: "Message received", data: contactMessageRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getAdminContactMessages = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM contact_messages
       ORDER BY created_at DESC`
    );
    res.json({ message: "Success", data: result.rows.map(contactMessageRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateAdminContactMessage = async (req, res) => {
  try {
    const status = String(req.body.status || "").trim();
    if (!["new", "read", "archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid message status." });
    }

    const result = await pool.query(
      `UPDATE contact_messages
       SET status = $1,
           read_at = CASE WHEN $1 = 'read' AND read_at IS NULL THEN NOW() ELSE read_at END
       WHERE id = $2
       RETURNING *`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Message not found" });
    res.json({ message: "Message updated", data: contactMessageRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteAdminContactMessage = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM contact_messages WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Message not found" });
    res.json({ message: "Message deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createContactMessage,
  getAdminContactMessages,
  updateAdminContactMessage,
  deleteAdminContactMessage,
};
