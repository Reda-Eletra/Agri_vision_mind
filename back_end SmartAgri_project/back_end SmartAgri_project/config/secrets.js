require("dotenv").config();

const crypto = require("crypto");

const getRequiredEnv = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }
  return value;
};

const JWT_SECRET = getRequiredEnv("JWT_SECRET");
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() ||
  crypto.createHash("sha256").update(`${JWT_SECRET}:session`).digest("hex");

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  SESSION_SECRET,
};
