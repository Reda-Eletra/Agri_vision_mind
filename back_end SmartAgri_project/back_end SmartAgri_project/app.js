require('dotenv').config();

const express     = require('express');
const session     = require('express-session');
const passport    = require('./config/passport');
const rateLimit   = require('express-rate-limit');
const helmet      = require('helmet');
const { SESSION_SECRET } = require('./config/secrets');
const upload      = require('./config/multer');

const authRoutes       = require('./routes/authRoutes');
const farmRoutes       = require('./routes/farmRoutes');
const plantRoutes      = require('./routes/plantRoutes');
const communityRoutes  = require('./routes/communityRoutes');
const dashboardRoutes  = require('./routes/dashboardRoutes');
const userPlantsRoutes = require('./routes/userPlantsRoutes');
const adminRoutes      = require('./routes/adminRoutes');
const newsRoutes       = require('./routes/newsRoutes');
const diseaseLibraryRoutes = require('./routes/diseaseLibraryRoutes');
const growthGuideRoutes = require('./routes/growthGuideRoutes');
const storeRoutes       = require('./routes/storeRoutes');
const errorHandler     = require('./middlewares/errorHandler');

const app = express();
let swaggerUi = null;
let swaggerSpec = null;
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');

try {
  swaggerUi = require('swagger-ui-express');
  swaggerSpec = require('./config/swagger');
} catch (error) {
  console.warn('Swagger docs disabled:', error.message);
}

// ─── Database Connection ─────────────────────────────────────
// ─── CORS ─────────────────────────────────────────────────────
const configuredFrontendOrigins = new Set(
  (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

const isLocalDevOrigin = (origin) => {
  if (!origin) return false;

  try {
    const parsed = new URL(origin);
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(parsed.hostname);
  } catch (_error) {
    return false;
  }
};

const isAllowedOrigin = (origin) =>
  Boolean(origin) &&
  (configuredFrontendOrigins.has(origin) || isLocalDevOrigin(origin));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Vary', 'Origin');
  }
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Core Middleware ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(upload.uploadDir, {
  maxAge: isProduction ? '7d' : 0,
  immutable: isProduction,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
if (process.env.NODE_ENV !== 'test') app.use('/api', generalLimiter);

// ─── Rate Limiting (auth endpoints) ──────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/auth/login',           authLimiter);
  app.use('/api/auth/register',        authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
}

// ─── Session (required for Passport) ────────────────────────
// Uses SESSION_SECRET — distinct from JWT_SECRET
app.use(session({
  secret:            SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
  },
}));

// ─── Passport ────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ─── Swagger UI ──────────────────────────────────────────────
if (swaggerUi && swaggerSpec && !isProduction) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: '🌱 Smart Agriculture API Docs',
    customCss:       '.swagger-ui .topbar { background-color: #2d6a4f; }',
    swaggerOptions:  { persistAuthorization: true },
  }));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// ─── API Routes ──────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api', farmRoutes);
app.use('/api', plantRoutes);
app.use('/api', communityRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', userPlantsRoutes);
app.use('/api', adminRoutes);
app.use('/api', newsRoutes);
app.use('/api', diseaseLibraryRoutes);
app.use('/api', growthGuideRoutes);
app.use('/api', storeRoutes);

// ─── Health Check ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.1.0', timestamp: new Date().toISOString() });
});

// ─── 404 ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ────────────────────────────────────
app.use(errorHandler);

module.exports = app;
