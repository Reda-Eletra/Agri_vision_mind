const up = async (client) => {
  await client.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username VARCHAR(100),
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE
  `);

  await client.query("UPDATE users SET role = 'user' WHERE role IS NULL");
  await client.query("UPDATE users SET is_active = TRUE WHERE is_active IS NULL");

  await client.query("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'");
  await client.query("ALTER TABLE users ALTER COLUMN is_active SET DEFAULT TRUE");

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_role_check'
          AND conrelid = 'users'::regclass
      ) THEN
        ALTER TABLE users
          ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
      END IF;
    END
    $$;
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
      ON users(username)
      WHERE username IS NOT NULL
  `);
};

module.exports = { up };
