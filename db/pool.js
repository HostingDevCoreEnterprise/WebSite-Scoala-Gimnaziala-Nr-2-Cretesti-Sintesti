const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Avoid crashing process on idle connection disconnects/reconnects
pool.on('error', (err) => {
  console.error('[Database Pool] Idle client error:', err.message);
});

module.exports = pool;

