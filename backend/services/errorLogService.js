const db = require('../config/db');

const SENSITIVE_KEYS = new Set(['password', 'newPassword', 'password_hash', 'token', 'secret']);

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const safe = {};
  for (const [k, v] of Object.entries(body)) {
    safe[k] = SENSITIVE_KEYS.has(k) ? '[redacted]' : v;
  }
  return safe;
}

exports.logError = (err, req) => {
  setImmediate(async () => {
    try {
      const context = req ? { query: req.query || {}, body: sanitizeBody(req.body) } : null;
      await db.query(
        `INSERT INTO error_log (level, message, stack, method, path, user_id, status_code, context)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'error',
          err.message || 'Unknown error',
          err.stack || null,
          req?.method || null,
          req?.path || null,
          req?.user?.id || null,
          err.status || 500,
          context,
        ]
      );
    } catch { /* never let log failure crash anything */ }
  });
};
