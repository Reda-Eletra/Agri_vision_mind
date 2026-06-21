const tableExists = async (client, tableName) => {
  const found = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return found.rows.length > 0;
};

const up = async (client) => {
  if (!(await tableExists(client, "user_tracked_plants"))) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_tracked_plants (
        id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name                      VARCHAR(200) NOT NULL,
        species_name              VARCHAR(150),
        image_url                 TEXT,
        health_status             VARCHAR(50) DEFAULT 'healthy'
                                    CHECK (health_status IN ('healthy','infected','recovering','dead')),
        recovery_progress_percent NUMERIC(5, 2) DEFAULT 0,
        last_check_date           DATE,
        diagnosis_json            JSONB,
        progress_log_json         JSONB DEFAULT '[]',
        created_at                TIMESTAMP DEFAULT NOW(),
        updated_at                TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  if (!(await tableExists(client, "user_diagnosis_history"))) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_diagnosis_history (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date       DATE DEFAULT CURRENT_DATE,
        plant_name VARCHAR(200),
        image_url  TEXT,
        diagnosis  JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  if (!(await tableExists(client, "sync_logs"))) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        section       VARCHAR(50) NOT NULL,
        status        VARCHAR(50) NOT NULL,
        start_time    TIMESTAMP DEFAULT NOW(),
        end_time      TIMESTAMP,
        scanned_count INTEGER DEFAULT 0,
        created_count INTEGER DEFAULT 0,
        updated_count INTEGER DEFAULT 0,
        failed_count  INTEGER DEFAULT 0,
        error_message TEXT,
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  await client.query("CREATE INDEX IF NOT EXISTS idx_user_tracked_plants_user_id ON user_tracked_plants(user_id)");
  await client.query("CREATE INDEX IF NOT EXISTS idx_user_diag_history_user_id ON user_diagnosis_history(user_id)");
  await client.query("CREATE INDEX IF NOT EXISTS idx_sync_logs_section ON sync_logs(section)");
  await client.query("CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC)");
};

module.exports = { up };
