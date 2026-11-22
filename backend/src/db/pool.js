require('dotenv').config();
const { Pool } = require('pg');

// Die enigste plek in die projek wat van die databasis se
// geloofsbriewe weet. Alles anders importeer hierdie poel.
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

module.exports = pool;
