-- ============================================================
--   Smart Agriculture Management Platform — Database Schema
--   Version 2.0 (Google OAuth + Password Reset)
-- ============================================================

-- UUIDs are natively supported via gen_random_uuid()

-- ─── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  email             VARCHAR(150) UNIQUE NOT NULL,
  username          VARCHAR(100) UNIQUE,
  password          VARCHAR(255),
  phone             VARCHAR(20),
  location          VARCHAR(150),
  avatar_url        TEXT,
  google_id         VARCHAR(100) UNIQUE,
  auth_provider     VARCHAR(20) DEFAULT 'local'
                      CHECK (auth_provider IN ('local','google')),
  is_email_verified BOOLEAN DEFAULT FALSE,
  role              VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user','admin')),
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── FARMS ──────────────────────────────────────────────────
-- Farms are containers for land; crop/season/dates moved to farm_cycles
CREATE TABLE IF NOT EXISTS farms (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                  VARCHAR(150) NOT NULL,
  location              VARCHAR(200),
  area                  NUMERIC(10, 2) NOT NULL,
  area_unit             VARCHAR(10)  DEFAULT 'hectare',
  soil_type             VARCHAR(100),
  image_url             TEXT,
  satellite_polygon_id  VARCHAR(200),
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- ─── FARM COORDINATES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS farm_coordinates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id     UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  latitude    NUMERIC(10, 7) NOT NULL,
  longitude   NUMERIC(10, 7) NOT NULL,
  order_index INTEGER NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── FARM CYCLES ────────────────────────────────────────────
-- Represents a growing season/crop cycle for a specific farm
CREATE TABLE IF NOT EXISTS farm_cycles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id        UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  crop           VARCHAR(150) NOT NULL,
  season         VARCHAR(100) NOT NULL,
  planting_date  DATE NOT NULL,
  harvest_date   DATE,
  status         VARCHAR(50) DEFAULT 'active'
                   CHECK (status IN ('active','completed','paused')),
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

-- ─── TRACKED PLANTS ─────────────────────────────────────────
-- Plants tracked within a farm cycle
CREATE TABLE IF NOT EXISTS tracked_plants (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_cycle_id             UUID NOT NULL REFERENCES farm_cycles(id) ON DELETE CASCADE,
  user_defined_name         VARCHAR(200) NOT NULL,
  species_name              VARCHAR(150) NOT NULL,
  image_url                 TEXT,
  recovery_progress_percent NUMERIC(5, 2) DEFAULT 0,
  last_check_date           DATE,
  created_at                TIMESTAMP DEFAULT NOW(),
  updated_at                TIMESTAMP DEFAULT NOW()
);

-- ─── DIAGNOSIS HISTORY ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnosis_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id        UUID NOT NULL REFERENCES tracked_plants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  image_url       TEXT,
  disease_name    VARCHAR(200),
  confidence      NUMERIC(4, 3),
  severity        VARCHAR(50) CHECK (severity IN ('low','medium','high','critical')),
  recommendations TEXT,
  raw_ai_response JSONB,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ─── PROGRESS LOGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id         UUID NOT NULL REFERENCES tracked_plants(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id),
  note             TEXT,
  image_url        TEXT,
  recovery_percent NUMERIC(5, 2),
  logged_at        TIMESTAMP DEFAULT NOW()
);

-- ─── SCHEDULE TASKS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedule_tasks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_cycle_id UUID NOT NULL REFERENCES farm_cycles(id) ON DELETE CASCADE,
  task_name  VARCHAR(200) NOT NULL,
  task_type  VARCHAR(50) CHECK (task_type IN ('watering','fertilizing','harvesting','spraying','other')),
  date       DATE NOT NULL,
  completed  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── POSTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(300) NOT NULL,
  body        TEXT NOT NULL,
  category    VARCHAR(50) DEFAULT 'general',
  image_url   TEXT,
  likes_count INTEGER DEFAULT 0,
  is_visible  BOOLEAN DEFAULT TRUE,
  deleted_at  TIMESTAMP DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ─── POST COMMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── POST LIKES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- ─── TRANSACTIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id     UUID REFERENCES farms(id) ON DELETE SET NULL,
  user_id     UUID NOT NULL REFERENCES users(id),
  amount      NUMERIC(12, 2) NOT NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('income','expense')),
  category    VARCHAR(100),
  description TEXT,
  date        DATE NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── USER TRACKED PLANTS (standalone – no cycle required) ────
CREATE TABLE IF NOT EXISTS user_tracked_plants (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                      VARCHAR(200) NOT NULL,
  species_name              VARCHAR(150),
  image_url                 TEXT,
  health_status             VARCHAR(50)  DEFAULT 'healthy'
                              CHECK (health_status IN ('healthy','infected','recovering','dead')),
  recovery_progress_percent NUMERIC(5, 2) DEFAULT 0,
  last_check_date           DATE,
  diagnosis_json            JSONB,
  progress_log_json         JSONB        DEFAULT '[]',
  created_at                TIMESTAMP    DEFAULT NOW(),
  updated_at                TIMESTAMP    DEFAULT NOW()
);

-- ─── USER DIAGNOSIS HISTORY (standalone) ─────────────────────
CREATE TABLE IF NOT EXISTS user_diagnosis_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       DATE             DEFAULT CURRENT_DATE,
  plant_name VARCHAR(200),
  image_url  TEXT,
  diagnosis  JSONB            NOT NULL,
  created_at TIMESTAMP        DEFAULT NOW()
);

-- ─── NEWS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             VARCHAR(300) NOT NULL,
  summary           TEXT         NOT NULL,
  content           TEXT         NOT NULL,
  image_url         TEXT,
  category          VARCHAR(80)  DEFAULT 'general',
  published_at      TIMESTAMP    DEFAULT NOW(),
  created_at        TIMESTAMP    DEFAULT NOW(),
  updated_at        TIMESTAMP    DEFAULT NOW(),
  source_name       VARCHAR(120),
  source_url        TEXT UNIQUE,
  source_article_id VARCHAR(120),
  is_imported       BOOLEAN      DEFAULT FALSE,
  is_visible        BOOLEAN      DEFAULT TRUE,
  deleted_at        TIMESTAMP    DEFAULT NULL
);

-- ─── AI USAGE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  endpoint      VARCHAR(200),
  provider      VARCHAR(100) DEFAULT 'simulated',
  tokens_used   INTEGER DEFAULT 0,
  latency_ms    INTEGER,
  cost_estimate NUMERIC(10, 6) DEFAULT 0,
  success       BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email             ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id         ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token      ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user       ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_farms_user_id           ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_cycles_farm_id     ON farm_cycles(farm_id);
CREATE INDEX IF NOT EXISTS idx_tracked_plants_cycle_id ON tracked_plants(farm_cycle_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_plant_id      ON diagnosis_history(plant_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id           ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_farm_id    ON transactions(farm_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id        ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tracked_plants_user_id  ON user_tracked_plants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_diag_history_user_id    ON user_diagnosis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id         ON transactions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_source_url_unique ON news(source_url);
CREATE INDEX IF NOT EXISTS idx_news_published_at             ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_is_imported              ON news(is_imported);
CREATE INDEX IF NOT EXISTS idx_posts_visibility              ON posts(is_visible, deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_visibility               ON news(is_visible, deleted_at, published_at DESC);

CREATE TABLE IF NOT EXISTS disease_library (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(300) NOT NULL,
  description       TEXT NOT NULL,
  symptoms_json     JSONB DEFAULT '[]',
  treatment_json    JSONB DEFAULT '[]',
  prevention_json   JSONB DEFAULT '[]',
  image_url         TEXT,
  category          VARCHAR(120) DEFAULT 'plant-disease',
  hosts_json        JSONB DEFAULT '[]',
  scientific_name   TEXT,
  language          VARCHAR(10) DEFAULT 'ar',
  source_name       VARCHAR(120),
  source_url        TEXT UNIQUE,
  source_article_id VARCHAR(120),
  is_imported       BOOLEAN DEFAULT TRUE,
  is_visible        BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at        TIMESTAMP DEFAULT NULL,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_disease_library_source_url_unique ON disease_library(source_url);
CREATE INDEX IF NOT EXISTS idx_disease_library_language ON disease_library(language);
CREATE INDEX IF NOT EXISTS idx_disease_library_updated_at ON disease_library(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_disease_library_visibility ON disease_library(is_visible, deleted_at, language);

-- ─── GROWTH GUIDES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS growth_guides (
  id                        UUID PRIMARY KEY,
  slug                      VARCHAR(300) NOT NULL UNIQUE,
  name_en                   VARCHAR(300) NOT NULL,
  name_ar                   VARCHAR(300),
  scientific_name           VARCHAR(300),
  category                  VARCHAR(120) DEFAULT 'other'
                              CHECK (category IN ('vegetables', 'fruits', 'herbs', 'trees', 'flowers', 'other')),
  summary_en                TEXT,
  summary_ar                TEXT,
  description_en            TEXT,
  description_ar            TEXT,
  image_url                 TEXT,
  source_name               VARCHAR(120),
  source_url                TEXT UNIQUE,
  canonical_url             TEXT UNIQUE,
  sunlight_en               TEXT,
  sunlight_ar               TEXT,
  soil_en                   TEXT,
  soil_ar                   TEXT,
  watering_en               TEXT,
  watering_ar               TEXT,
  planting_en               TEXT,
  planting_ar               TEXT,
  sowing_en                 TEXT,
  sowing_ar                 TEXT,
  spacing_en                TEXT,
  spacing_ar                TEXT,
  care_en                   TEXT,
  care_ar                   TEXT,
  harvesting_en             TEXT,
  harvesting_ar             TEXT,
  common_problems_en        TEXT,
  common_problems_ar        TEXT,
  pests_en                  TEXT,
  pests_ar                  TEXT,
  diseases_en               TEXT,
  diseases_ar               TEXT,
  additional_details_json   JSONB DEFAULT '{}',
  is_visible                BOOLEAN DEFAULT TRUE,
  is_active                 BOOLEAN DEFAULT TRUE,
  deleted_at                TIMESTAMP DEFAULT NULL,
  language                  VARCHAR(10) DEFAULT 'en',
  last_synced_at            TIMESTAMP DEFAULT NOW(),
  created_at                TIMESTAMP DEFAULT NOW(),
  updated_at                TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_guides_slug ON growth_guides(slug);
CREATE INDEX IF NOT EXISTS idx_growth_guides_category ON growth_guides(category);
CREATE INDEX IF NOT EXISTS idx_growth_guides_source_name ON growth_guides(source_name);
CREATE INDEX IF NOT EXISTS idx_growth_guides_is_visible ON growth_guides(is_visible);

-- ─── SYNC LOGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_logs (
  id            UUID PRIMARY KEY,
  section       VARCHAR(50) NOT NULL, -- 'news', 'diseases', 'growth_guides'
  status        VARCHAR(50) NOT NULL, -- 'running', 'completed', 'failed'
  start_time    TIMESTAMP DEFAULT NOW(),
  end_time      TIMESTAMP,
  scanned_count INTEGER DEFAULT 0,
  created_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  failed_count  INTEGER DEFAULT 0,
  error_message TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_section ON sync_logs(section);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);

-- ─── ACTIVITY LOGS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id             UUID PRIMARY KEY,
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_name     VARCHAR(200) NOT NULL,
  action_type    VARCHAR(100) NOT NULL, -- 'login', 'edit_user', 'delete_user', etc.
  target_element VARCHAR(300),
  details        TEXT,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
