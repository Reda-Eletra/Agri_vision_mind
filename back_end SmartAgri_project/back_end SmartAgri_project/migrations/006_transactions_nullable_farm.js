exports.up = async (client) => {
  await client.query(`
    ALTER TABLE transactions
    ALTER COLUMN farm_id DROP NOT NULL
  `);
};
