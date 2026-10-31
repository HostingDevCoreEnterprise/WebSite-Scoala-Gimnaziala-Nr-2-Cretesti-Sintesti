const pool = require('./pool');

let intervalId = null;

/**
 * Pings the database with a lightweight query to maintain activity
 * and prevent cloud providers like Aiven from powering off due to idle timeout.
 */
async function pingDatabase() {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'DATABASE_URL not configured' };
  }

  try {
    const start = Date.now();
    await pool.query('SELECT 1;');
    const duration = Date.now() - start;

    if (process.env.DEBUG_KEEP_ALIVE === 'true') {
      console.log(`[Keep-Alive] DB ping successful (${duration}ms) at ${new Date().toISOString()}`);
    }

    return { success: true, duration };
  } catch (err) {
    console.error(`[Keep-Alive] DB ping failed at ${new Date().toISOString()}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Starts the background keep-alive interval.
 * @param {number} intervalMinutes Frequency in minutes (default 5)
 */
function startKeepAlive(intervalMinutes = 5) {
  if (intervalId) return;

  if (process.env.KEEP_ALIVE_DISABLED === 'true') {
    console.log('[Keep-Alive] Background keep-alive worker is disabled by KEEP_ALIVE_DISABLED=true');
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.log('[Keep-Alive] DATABASE_URL not set; skipping keep-alive worker.');
    return;
  }

  const minutes = Math.max(1, intervalMinutes);
  const ms = minutes * 60 * 1000;

  console.log(`[Keep-Alive] Started database keep-alive background worker (pinging every ${minutes}m)`);

  // Initial ping 5 seconds after server startup
  const initialTimeout = setTimeout(() => {
    pingDatabase();
  }, 5000);
  if (initialTimeout.unref) {
    initialTimeout.unref();
  }

  intervalId = setInterval(pingDatabase, ms);
  if (intervalId.unref) {
    intervalId.unref();
  }
}

/**
 * Stops the background keep-alive interval.
 */
function stopKeepAlive() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Keep-Alive] Database keep-alive background worker stopped');
  }
}

module.exports = {
  pingDatabase,
  startKeepAlive,
  stopKeepAlive
};
