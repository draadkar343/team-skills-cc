const crypto = require('crypto');
const db = require('../config/db');

// Returns middleware that validates an X-API-Key header and checks the required scope.
module.exports = (requiredScope) => async (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'API key required (X-API-Key header)' });

  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  let rows;
  try {
    ({ rows } = await db.query(
      'SELECT id, scopes FROM api_keys WHERE key_hash = $1 AND is_active = true',
      [keyHash]
    ));
  } catch {
    return res.status(500).json({ error: 'Internal error' });
  }

  if (!rows.length) return res.status(401).json({ error: 'Invalid or revoked API key' });

  const apiKey = rows[0];
  if (requiredScope && !apiKey.scopes.includes(requiredScope)) {
    return res.status(403).json({ error: `This API key does not have the '${requiredScope}' scope` });
  }

  // Update last_used_at asynchronously — don't block the request
  db.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [apiKey.id]).catch(() => {});

  req.apiKey = apiKey;
  next();
};
