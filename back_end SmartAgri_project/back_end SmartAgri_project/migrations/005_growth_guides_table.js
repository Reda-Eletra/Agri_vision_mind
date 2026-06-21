const tableExists = async (client, tableName) => {
  const found = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return found.rows.length > 0;
};

const up = async (client) => {
  if (!(await tableExists(client, "growth_guides"))) {
    await client.query(`
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
      )
    `);
  }

  await client.query("CREATE INDEX IF NOT EXISTS idx_growth_guides_slug ON growth_guides(slug)");
  await client.query("CREATE INDEX IF NOT EXISTS idx_growth_guides_category ON growth_guides(category)");
  await client.query("CREATE INDEX IF NOT EXISTS idx_growth_guides_source_name ON growth_guides(source_name)");
  await client.query("CREATE INDEX IF NOT EXISTS idx_growth_guides_is_visible ON growth_guides(is_visible)");
};

module.exports = { up };
