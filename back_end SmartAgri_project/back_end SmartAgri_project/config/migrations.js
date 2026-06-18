const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
const ADVISORY_LOCK_ID = 764832019;
const LEGACY_BASELINE_TABLES = [
  "users",
  "farms",
  "farm_coordinates",
  "farm_cycles",
  "posts",
  "post_likes",
  "post_comments",
  "news",
];
const LEGACY_BASELINE_COLUMNS = [
  ["users", "google_id"],
  ["farms", "image_url"],
  ["posts", "likes_count"],
  ["news", "published_at"],
];

const migrationChecksum = (sql) =>
  crypto.createHash("sha256").update(sql).digest("hex");

const loadMigrations = async (migrationsDir = DEFAULT_MIGRATIONS_DIR) => {
  const filenames = (await fs.readdir(migrationsDir))
    .filter((filename) => /^\d+_[a-z0-9_-]+\.(sql|js)$/i.test(filename))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(filenames.map(async (filename) => {
    const fullPath = path.join(migrationsDir, filename);
    const source = await fs.readFile(fullPath, "utf8");
    const version = filename.slice(0, filename.indexOf("_"));
    const up = filename.endsWith(".js") ? require(fullPath).up : null;
    if (filename.endsWith(".js") && typeof up !== "function") {
      throw new Error(`Migration ${filename} must export an up(client) function.`);
    }
    return {
      version,
      filename,
      source,
      up,
      checksum: migrationChecksum(source),
    };
  }));
};

const createMigrationTable = async (client) => {
  if (await tableExists(client, "schema_migrations")) return;
  await client.query(`
  CREATE TABLE schema_migrations (
    version     VARCHAR(100) PRIMARY KEY,
    filename    VARCHAR(255) NOT NULL,
    checksum    VARCHAR(64) NOT NULL,
    applied_at  TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `);
};

const tableExists = async (client, tableName) => {
  const found = await client.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1
     LIMIT 1`,
    [tableName]
  );
  return found.rows.length > 0;
};

const columnExists = async (client, tableName, columnName) => {
  const found = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );
  return found.rows.length > 0;
};

const appliedMigrations = async (client) => {
  const applied = await client.query(
    "SELECT version, filename, checksum, applied_at FROM schema_migrations ORDER BY version"
  );
  return new Map(applied.rows.map((row) => [row.version, row]));
};

const adoptExistingBaseline = async (client, migrations, applied) => {
  if (applied.size > 0 || migrations.length === 0) return;
  const existingTables = await Promise.all(
    LEGACY_BASELINE_TABLES.map((tableName) => tableExists(client, tableName))
  );
  if (!existingTables.every(Boolean)) return;
  const existingColumns = await Promise.all(
    LEGACY_BASELINE_COLUMNS.map(([tableName, columnName]) =>
      columnExists(client, tableName, columnName)
    )
  );
  if (!existingColumns.every(Boolean)) return;

  const baseline = migrations[0];
  await client.query(
    `INSERT INTO schema_migrations (version, filename, checksum)
     VALUES ($1, $2, $3)`,
    [baseline.version, baseline.filename, baseline.checksum]
  );
  applied.set(baseline.version, baseline);
};

const verifyAppliedChecksums = (migrations, applied) => {
  for (const migration of migrations) {
    const recorded = applied.get(migration.version);
    if (recorded && recorded.checksum !== migration.checksum) {
      throw new Error(`Applied migration ${migration.filename} has been modified.`);
    }
  }
};

const applyMigration = async (client, migration) => {
  await client.query("BEGIN");
  try {
    if (migration.up) await migration.up(client);
    else await client.query(migration.source);
    await client.query(
      `INSERT INTO schema_migrations (version, filename, checksum)
       VALUES ($1, $2, $3)`,
      [migration.version, migration.filename, migration.checksum]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw new Error(`Migration ${migration.filename} failed: ${error.message}`, { cause: error });
  }
};

const withMigrationLock = async (client, useAdvisoryLock, operation) => {
  if (!useAdvisoryLock) return operation();

  await client.query("SELECT pg_advisory_lock($1)", [ADVISORY_LOCK_ID]);
  try {
    return await operation();
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_ID]);
  }
};

const runMigrations = async (pool, options = {}) => {
  const migrations = await loadMigrations(options.migrationsDir);
  const client = await pool.connect();
  const useAdvisoryLock = options.useAdvisoryLock ?? pool.getMode?.() === "postgres";

  try {
    return await withMigrationLock(client, useAdvisoryLock, async () => {
      await createMigrationTable(client);
      const applied = await appliedMigrations(client);
      if (options.adoptExistingBaseline !== false) {
        await adoptExistingBaseline(client, migrations, applied);
      }
      verifyAppliedChecksums(migrations, applied);

      const newlyApplied = [];
      for (const migration of migrations) {
        if (applied.has(migration.version)) continue;
        await applyMigration(client, migration);
        newlyApplied.push(migration.filename);
      }
      return newlyApplied;
    });
  } finally {
    client.release?.();
  }
};

const migrationStatus = async (pool, options = {}) => {
  const migrations = await loadMigrations(options.migrationsDir);
  const client = await pool.connect();
  try {
    await createMigrationTable(client);
    const applied = await appliedMigrations(client);
    verifyAppliedChecksums(migrations, applied);
    return migrations.map((migration) => ({
      version: migration.version,
      filename: migration.filename,
      status: applied.has(migration.version) ? "applied" : "pending",
    }));
  } finally {
    client.release?.();
  }
};

module.exports = { runMigrations, migrationStatus, loadMigrations };
