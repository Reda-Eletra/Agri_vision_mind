const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { createMemoryPool } = require("./memoryDatabase");
require("dotenv").config();

const requestedMode = (process.env.DB_MODE || process.env.DB_CLIENT || "auto").toLowerCase();
const validModes = new Set(["auto", "postgres", "memory"]);
const configuredMode = validModes.has(requestedMode) ? requestedMode : "auto";
const isProduction = process.env.NODE_ENV === "production";
const allowMemoryFallback =
  !isProduction &&
  configuredMode === "auto" &&
  (process.env.DB_FALLBACK_TO_MEMORY || "true").toLowerCase() === "true";

const parsePort = (value) => {
  const port = Number.parseInt(String(value || ""), 10);
  return Number.isNaN(port) ? 5432 : port;
};

const createPostgresPool = () => {
  const ssl = process.env.DB_SSL === "true" || isProduction
    ? { rejectUnauthorized: false }
    : false;
  const connectionString = process.env.DATABASE_URL?.trim();

  if (connectionString) return new Pool({ connectionString, ssl });

  return new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parsePort(process.env.DB_PORT),
    ssl,
  });
};

const connectionErrorCodes = new Set([
  "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EHOSTUNREACH", "ECONNRESET",
  "28P01", "28000", "3D000", "08001", "08006", "08004",
]);

const isConnectionFailure = (error) => {
  if (!error) return false;
  if (connectionErrorCodes.has(error.code)) return true;
  if (Array.isArray(error.errors)) return error.errors.some(isConnectionFailure);
  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EHOSTUNREACH|ECONNRESET|password authentication failed/i
    .test(String(error.message || ""));
};

const listeners = [];
let postgresPool;
let memoryPool;
let activePool;
let activeMode;

const attachListeners = (targetPool) => {
  for (const { event, listener } of listeners) targetPool.on?.(event, listener);
};

const postgres = () => {
  if (!postgresPool) {
    postgresPool = createPostgresPool();
    attachListeners(postgresPool);
  }
  return postgresPool;
};

const memory = () => {
  if (!memoryPool) {
    memoryPool = createMemoryPool();
    attachListeners(memoryPool);
  }
  return memoryPool;
};

if (configuredMode === "memory") {
  activePool = memory();
  activeMode = "memory";
} else {
  activePool = postgres();
  activeMode = "postgres";
}

const switchToMemory = (error) => {
  if (!allowMemoryFallback || activeMode !== "postgres" || !isConnectionFailure(error)) {
    return false;
  }

  activePool = memory();
  activeMode = "memory";
  console.warn("PostgreSQL is unavailable; using in-memory pg-mem for this development process.");
  return true;
};

const execute = async (operation) => {
  try {
    return await operation(activePool);
  } catch (error) {
    if (!switchToMemory(error)) throw error;
    return operation(activePool);
  }
};

const pool = {
  query(text, params) {
    return execute((targetPool) => targetPool.query(text, params));
  },
  connect(callback) {
    if (typeof callback !== "function") {
      return execute((targetPool) => targetPool.connect());
    }

    execute((targetPool) => targetPool.connect())
      .then((client) => callback(null, client, () => client.release?.()))
      .catch((error) => callback(error));
  },
  getMode() {
    return activeMode;
  },
  on(event, listener) {
    listeners.push({ event, listener });
    postgresPool?.on?.(event, listener);
    memoryPool?.on?.(event, listener);
    return pool;
  },
  async end() {
    const endings = [postgresPool?.end(), memoryPool?.end()].filter(Boolean);
    await Promise.allSettled(endings);
  },
  async seedAdminUser() {
    if (isProduction || process.env.NODE_ENV === "test") return;

    const existingAdmin = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1",
      ["admin", "admin@agrivision.com"]
    );
    if (existingAdmin.rows.length > 0) return;

    const hashedPassword = await bcrypt.hash("admin", 10);
    await pool.query(
      `INSERT INTO users (id, name, email, username, password, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'admin', TRUE)`,
      [uuidv4(), "System Administrator", "admin@agrivision.com", "admin", hashedPassword]
    );
    console.warn("Development demo administrator created with the documented demo credentials.");
  },
};

if (!validModes.has(requestedMode)) {
  console.warn(`Unknown DB mode "${requestedMode}"; using auto mode.`);
}

pool.on("error", (error) => {
  console.error("Unexpected database client error:", error);
});

module.exports = pool;
