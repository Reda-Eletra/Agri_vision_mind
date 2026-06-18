const tableExists = async (client, tableName) => {
  const found = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return found.rows.length > 0;
};

const createDiseaseLibrary = (client) => client.query(`
  CREATE TABLE disease_library (
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
  )
`);

const statements = [
  `ALTER TABLE farms
     ADD COLUMN IF NOT EXISTS satellite_polygon_id VARCHAR(200)`,
  `ALTER TABLE posts
     ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE,
     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL`,
  "UPDATE posts SET is_visible = TRUE WHERE is_visible IS NULL",
  "ALTER TABLE posts ALTER COLUMN is_visible SET DEFAULT TRUE",
  "ALTER TABLE posts ALTER COLUMN is_visible SET NOT NULL",
  `ALTER TABLE news
     ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE,
     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL`,
  "UPDATE news SET is_visible = TRUE WHERE is_visible IS NULL",
  "ALTER TABLE news ALTER COLUMN is_visible SET DEFAULT TRUE",
  "ALTER TABLE news ALTER COLUMN is_visible SET NOT NULL",
  `ALTER TABLE disease_library
     ADD COLUMN IF NOT EXISTS symptoms_json JSONB DEFAULT '[]',
     ADD COLUMN IF NOT EXISTS treatment_json JSONB DEFAULT '[]',
     ADD COLUMN IF NOT EXISTS prevention_json JSONB DEFAULT '[]',
     ADD COLUMN IF NOT EXISTS image_url TEXT,
     ADD COLUMN IF NOT EXISTS category VARCHAR(120) DEFAULT 'plant-disease',
     ADD COLUMN IF NOT EXISTS hosts_json JSONB DEFAULT '[]',
     ADD COLUMN IF NOT EXISTS scientific_name TEXT,
     ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'ar',
     ADD COLUMN IF NOT EXISTS source_name VARCHAR(120),
     ADD COLUMN IF NOT EXISTS source_url TEXT,
     ADD COLUMN IF NOT EXISTS source_article_id VARCHAR(120),
     ADD COLUMN IF NOT EXISTS is_imported BOOLEAN DEFAULT TRUE,
     ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE,
     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL,
     ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
  "UPDATE disease_library SET is_visible = TRUE WHERE is_visible IS NULL",
  "ALTER TABLE disease_library ALTER COLUMN is_visible SET DEFAULT TRUE",
  "ALTER TABLE disease_library ALTER COLUMN is_visible SET NOT NULL",
  "CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(is_visible, deleted_at, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_news_visibility ON news(is_visible, deleted_at, published_at DESC)",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_disease_library_source_url_unique ON disease_library(source_url)",
  "CREATE INDEX IF NOT EXISTS idx_disease_library_language ON disease_library(language)",
  "CREATE INDEX IF NOT EXISTS idx_disease_library_updated_at ON disease_library(updated_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_disease_library_visibility ON disease_library(is_visible, deleted_at, language)",
];

const up = async (client) => {
  if (!(await tableExists(client, "disease_library"))) {
    await createDiseaseLibrary(client);
  }
  for (const statement of statements) await client.query(statement);
};

module.exports = { up };
