const { Pool } = require('pg');
const { parse } = require('pg-connection-string');

let config = {};
if (process.env.DATABASE_URL) {
  config = parse(process.env.DATABASE_URL);
}

const pool = new Pool({
  ...config,
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

