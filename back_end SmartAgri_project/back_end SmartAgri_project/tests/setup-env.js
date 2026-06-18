const os = require("os");
const path = require("path");

process.env.NODE_ENV = "test";
process.env.DB_MODE = "memory";
process.env.JWT_SECRET = "automated-test-secret";
process.env.SESSION_SECRET = "automated-test-session-secret";
process.env.NEWS_SYNC_ENABLED = "false";
process.env.DISEASE_LIBRARY_SYNC_ENABLED = "false";
process.env.GROWTH_GUIDE_SYNC_ENABLED = "false";
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `avm-uploads-${process.pid}`);
