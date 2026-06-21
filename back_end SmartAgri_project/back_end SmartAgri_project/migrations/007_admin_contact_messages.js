const bcrypt = require("bcryptjs");

const tableExists = async (client, tableName) => {
  const found = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return found.rows.length > 0;
};

const up = async (client) => {
  if (!(await tableExists(client, "contact_messages"))) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name       VARCHAR(150) NOT NULL,
        email      VARCHAR(180) NOT NULL,
        subject    VARCHAR(250) NOT NULL,
        message    TEXT NOT NULL,
        status     VARCHAR(30) DEFAULT 'new'
                   CHECK (status IN ('new', 'read', 'archived')),
        created_at TIMESTAMP DEFAULT NOW(),
        read_at    TIMESTAMP
      )
    `);
  }

  const adminPassword = await bcrypt.hash("admin1152004", 10);
  const adminUser = await client.query(
    "SELECT id FROM users WHERE email = 'admin@system.local' OR username = 'admin' LIMIT 1"
  );
  if (adminUser.rows.length > 0) {
    await client.query(
      `UPDATE users
       SET name = 'Admin',
           email = 'admin@system.local',
           username = 'admin',
           password = $1,
           role = 'admin',
           auth_provider = 'local',
           is_active = TRUE,
           is_email_verified = TRUE,
           updated_at = NOW()
       WHERE id = $2`,
      [adminPassword, adminUser.rows[0].id]
    );
  } else {
    await client.query(
      `INSERT INTO users (name, email, username, password, role, auth_provider, is_active, is_email_verified)
       VALUES ('Admin', 'admin@system.local', 'admin', $1, 'admin', 'local', TRUE, TRUE)`,
      [adminPassword]
    );
  }

  await client.query("CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC)");
  await client.query("CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status)");
};

module.exports = { up };
