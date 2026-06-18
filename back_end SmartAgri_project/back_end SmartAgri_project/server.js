require("dotenv").config();

const app = require("./app");
const pool = require("./config/database");
const { runMigrations } = require("./config/migrations");
const { startNewsAutoSync } = require("./services/newsSyncService");
const { startDiseaseLibraryAutoSync } = require("./services/diseaseLibrarySyncService");
const { startGrowthGuideAutoSync } = require("./services/growthGuideSyncService");

const startBackgroundJobs = () => {
  if (process.env.NODE_ENV === "test") return;
  startNewsAutoSync();
  startDiseaseLibraryAutoSync();
  startGrowthGuideAutoSync();
};

const startServer = async () => {
  const applied = await runMigrations(pool);
  for (const filename of applied) console.log(`[db-migration] Applied ${filename}`);
  await pool.seedAdminUser();

  const port = process.env.PORT || 4000;
  const server = app.listen(port, () => {
    console.log(`Smart Agriculture API is running on port ${port}`);
  });
  startBackgroundJobs();
  return server;
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Server startup failed:", error);
    process.exitCode = 1;
  });
}

module.exports = { startServer };
