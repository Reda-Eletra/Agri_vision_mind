const pool = require("../config/database");
const { runMigrations, migrationStatus } = require("../config/migrations");

const printStatus = async () => {
  const statuses = await migrationStatus(pool);
  for (const migration of statuses) {
    console.log(`${migration.status.padEnd(7)} ${migration.filename}`);
  }
};

const migrate = async () => {
  const applied = await runMigrations(pool);
  if (applied.length === 0) {
    console.log("Database schema is up to date.");
    return;
  }
  for (const filename of applied) console.log(`Applied ${filename}`);
};

const main = async () => {
  try {
    if (process.argv[2] === "status") await printStatus();
    else await migrate();
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
