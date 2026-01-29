const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper to query the database
const query = (text, params) => pool.query(text, params);

module.exports = {
  query,
  pool,
};
