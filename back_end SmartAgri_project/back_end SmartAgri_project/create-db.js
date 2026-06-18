const { Pool } = require('pg');

async function createDb() {
  if (!process.env.DB_PASSWORD) {
    throw new Error('DB_PASSWORD is required to create the database.');
  }
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 5432),
  });

  try {
    await pool.query('CREATE DATABASE smart_agriculture');
    console.log('Database smart_agriculture created successfully.');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('Database already exists.');
    } else {
      console.error('Error creating database:', err);
    }
  } finally {
    await pool.end();
  }
}

createDb().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
