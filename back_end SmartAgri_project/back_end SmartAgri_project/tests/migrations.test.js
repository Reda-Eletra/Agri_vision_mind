const assert = require("node:assert/strict");
const test = require("node:test");
const { createMemoryPool } = require("../config/memoryDatabase");
const { runMigrations, migrationStatus } = require("../config/migrations");

test("fresh database migrations are complete and repeatable", async () => {
  const pool = createMemoryPool();
  try {
    const firstRun = await runMigrations(pool, { useAdvisoryLock: false });
    const secondRun = await runMigrations(pool, { useAdvisoryLock: false });
    const columns = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'farms' AND column_name = 'satellite_polygon_id'`
    );
    const statuses = await migrationStatus(pool);

    assert.deepEqual(firstRun, ["001_baseline.sql", "002_core_contract_fixes.js"]);
    assert.deepEqual(secondRun, []);
    assert.equal(columns.rows.length, 1);
    assert.ok(statuses.every((migration) => migration.status === "applied"));
  } finally {
    await pool.end();
  }
});

test("existing schema is adopted and upgraded without losing records", async () => {
  const pool = createMemoryPool();
  try {
    await pool.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        google_id VARCHAR(255)
      );
      CREATE TABLE farms (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        name VARCHAR(150) NOT NULL,
        area NUMERIC(10, 2) NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE farm_coordinates (
        id UUID PRIMARY KEY,
        farm_id UUID NOT NULL REFERENCES farms(id),
        latitude NUMERIC NOT NULL,
        longitude NUMERIC NOT NULL,
        order_index INTEGER NOT NULL
      );
      CREATE TABLE farm_cycles (
        id UUID PRIMARY KEY,
        farm_id UUID NOT NULL REFERENCES farms(id),
        crop VARCHAR(150) NOT NULL,
        season VARCHAR(100) NOT NULL,
        planting_date DATE NOT NULL
      );
      CREATE TABLE posts (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        title VARCHAR(300) NOT NULL,
        body TEXT NOT NULL,
        likes_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE post_likes (
        post_id UUID NOT NULL REFERENCES posts(id),
        user_id UUID NOT NULL REFERENCES users(id),
        PRIMARY KEY (post_id, user_id)
      );
      CREATE TABLE post_comments (
        id UUID PRIMARY KEY,
        post_id UUID NOT NULL REFERENCES posts(id),
        user_id UUID NOT NULL REFERENCES users(id),
        body TEXT NOT NULL
      );
      CREATE TABLE news (
        id UUID PRIMARY KEY,
        title VARCHAR(300) NOT NULL,
        summary TEXT NOT NULL,
        content TEXT NOT NULL,
        published_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE disease_library (
        id UUID PRIMARY KEY,
        name VARCHAR(300) NOT NULL,
        description TEXT NOT NULL,
        language VARCHAR(10) DEFAULT 'en'
      );
    `);
    await pool.query(
      `INSERT INTO users (id, name, email)
       VALUES ('10000000-0000-0000-0000-000000000001', 'Existing', 'existing@example.com')`
    );
    await pool.query(
      `INSERT INTO farms (id, user_id, name, area)
       VALUES (
         '20000000-0000-0000-0000-000000000001',
         '10000000-0000-0000-0000-000000000001',
         'Existing Farm',
         5
       )`
    );

    const applied = await runMigrations(pool, { useAdvisoryLock: false });
    const farm = await pool.query("SELECT name, satellite_polygon_id FROM farms");
    const migrationRows = await pool.query(
      "SELECT version FROM schema_migrations ORDER BY version"
    );

    assert.deepEqual(applied, ["002_core_contract_fixes.js"]);
    assert.equal(farm.rows[0].name, "Existing Farm");
    assert.equal(farm.rows[0].satellite_polygon_id, null);
    assert.deepEqual(migrationRows.rows.map((row) => row.version), ["001", "002"]);
    assert.deepEqual(await runMigrations(pool, { useAdvisoryLock: false }), []);
  } finally {
    await pool.end();
  }
});
