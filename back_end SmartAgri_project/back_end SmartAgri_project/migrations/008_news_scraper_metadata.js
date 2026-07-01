const up = async (client) => {
  await client.query(`
    ALTER TABLE news
      ADD COLUMN IF NOT EXISTS author_name TEXT,
      ADD COLUMN IF NOT EXISTS images_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS title_hash TEXT
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_news_title_hash_unique
    ON news(title_hash)
    WHERE title_hash IS NOT NULL AND deleted_at IS NULL
  `);
};

module.exports = { up };
