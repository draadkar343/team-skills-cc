const crypto = require('crypto');
const https = require('https');
const http = require('http');
const db = require('../config/db');

// ── API KEYS ────────────────────────────────────────────────────────────────

exports.listApiKeys = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ak.id, ak.name, ak.description, ak.key_prefix, ak.scopes,
              ak.is_active, ak.last_used_at, ak.created_at,
              u.first_name || ' ' || u.last_name AS created_by_name
       FROM api_keys ak
       JOIN users u ON u.id = ak.created_by
       ORDER BY ak.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.createApiKey = async (req, res, next) => {
  try {
    const { name, description, scopes } = req.body;
    if (!name || !Array.isArray(scopes) || !scopes.length) {
      return res.status(400).json({ error: 'Name and at least one scope are required' });
    }

    const rawKey = 'sk_' + crypto.randomBytes(28).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 10) + '...';

    const { rows } = await db.query(
      `INSERT INTO api_keys (name, description, key_hash, key_prefix, scopes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, description, key_prefix, scopes, created_at`,
      [name, description || null, keyHash, keyPrefix, scopes, req.user.id]
    );

    // Return the plaintext key only once — it cannot be retrieved again
    res.status(201).json({ ...rows[0], key: rawKey });
  } catch (err) { next(err); }
};

exports.revokeApiKey = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'UPDATE api_keys SET is_active = false WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'API key not found' });
    res.json({ revoked: rows[0].id });
  } catch (err) { next(err); }
};

exports.deleteApiKey = async (req, res, next) => {
  try {
    const { rows } = await db.query('DELETE FROM api_keys WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'API key not found' });
    res.json({ deleted: rows[0].id });
  } catch (err) { next(err); }
};

// ── EXTERNAL INTEGRATIONS ───────────────────────────────────────────────────

exports.listIntegrations = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ei.id, ei.name, ei.description, ei.base_url, ei.auth_type,
              ei.is_active, ei.created_at, ei.updated_at,
              u.first_name || ' ' || u.last_name AS created_by_name,
              (ei.auth_config != '{}') AS has_credentials
       FROM external_integrations ei
       JOIN users u ON u.id = ei.created_by
       ORDER BY ei.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getIntegration = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM external_integrations WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Integration not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.createIntegration = async (req, res, next) => {
  try {
    const { name, description, baseUrl, authType, authConfig } = req.body;
    if (!name || !baseUrl) return res.status(400).json({ error: 'Name and base URL are required' });
    const { rows } = await db.query(
      `INSERT INTO external_integrations (name, description, base_url, auth_type, auth_config, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description || null, baseUrl, authType || 'none', JSON.stringify(authConfig || {}), req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.updateIntegration = async (req, res, next) => {
  try {
    const { name, description, baseUrl, authType, authConfig, isActive } = req.body;
    const { rows } = await db.query(
      `UPDATE external_integrations SET
        name        = COALESCE($1, name),
        description = COALESCE($2, description),
        base_url    = COALESCE($3, base_url),
        auth_type   = COALESCE($4, auth_type),
        auth_config = COALESCE($5::jsonb, auth_config),
        is_active   = COALESCE($6, is_active),
        updated_at  = NOW()
       WHERE id = $7 RETURNING *`,
      [name || null, description || null, baseUrl || null, authType || null,
       authConfig ? JSON.stringify(authConfig) : null, isActive ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Integration not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteIntegration = async (req, res, next) => {
  try {
    const { rows } = await db.query('DELETE FROM external_integrations WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Integration not found' });
    res.json({ deleted: rows[0].id });
  } catch (err) { next(err); }
};

exports.testIntegration = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM external_integrations WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Integration not found' });

    const integration = rows[0];
    const cfg = integration.auth_config || {};
    const headers = { 'User-Agent': 'SkillsManagement/1.0' };

    if (integration.auth_type === 'api_key' && cfg.header && cfg.value) {
      headers[cfg.header] = cfg.value;
    } else if (integration.auth_type === 'bearer' && cfg.token) {
      headers['Authorization'] = `Bearer ${cfg.token}`;
    } else if (integration.auth_type === 'basic' && cfg.username) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${cfg.username}:${cfg.password || ''}`).toString('base64');
    }

    try {
      const url = new URL(integration.base_url);
      const lib = url.protocol === 'https:' ? https : http;
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname || '/',
        method: 'GET',
        headers,
      };

      const { statusCode, statusMessage } = await new Promise((resolve, reject) => {
        const request = lib.request(options, (r) => {
          r.resume();
          resolve({ statusCode: r.statusCode, statusMessage: r.statusMessage });
        });
        request.on('error', reject);
        request.setTimeout(8000, () => request.destroy(new Error('Connection timed out')));
        request.end();
      });

      res.json({ success: statusCode < 400, statusCode, statusMessage });
    } catch (err) {
      res.json({ success: false, statusCode: null, statusMessage: err.message });
    }
  } catch (err) { next(err); }
};

// ── WEBHOOKS ────────────────────────────────────────────────────────────────

exports.listWebhooks = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT w.id, w.name, w.url, w.events, w.is_active, w.created_at, w.updated_at,
              w.secret IS NOT NULL AND w.secret != '' AS has_secret,
              u.first_name || ' ' || u.last_name AS created_by_name,
              (SELECT COUNT(*) FROM webhook_deliveries wd WHERE wd.webhook_id = w.id) AS delivery_count,
              (SELECT MAX(wd.delivered_at) FROM webhook_deliveries wd WHERE wd.webhook_id = w.id) AS last_delivery_at,
              (SELECT wd.success FROM webhook_deliveries wd WHERE wd.webhook_id = w.id ORDER BY wd.delivered_at DESC LIMIT 1) AS last_delivery_success
       FROM webhooks w
       JOIN users u ON u.id = w.created_by
       ORDER BY w.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.createWebhook = async (req, res, next) => {
  try {
    const { name, url, secret, events } = req.body;
    if (!name || !url || !Array.isArray(events) || !events.length) {
      return res.status(400).json({ error: 'Name, URL, and at least one event are required' });
    }
    try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

    const { rows } = await db.query(
      `INSERT INTO webhooks (name, url, secret, events, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, url, events, is_active, created_at`,
      [name, url, secret || null, events, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.updateWebhook = async (req, res, next) => {
  try {
    const { name, url, secret, events, isActive } = req.body;
    if (url) { try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); } }
    const { rows } = await db.query(
      `UPDATE webhooks SET
        name      = COALESCE($1, name),
        url       = COALESCE($2, url),
        secret    = CASE WHEN $3::boolean THEN $4 ELSE secret END,
        events    = COALESCE($5, events),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name || null, url || null, secret !== undefined, secret || null,
       events || null, isActive ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Webhook not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteWebhook = async (req, res, next) => {
  try {
    const { rows } = await db.query('DELETE FROM webhooks WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Webhook not found' });
    res.json({ deleted: rows[0].id });
  } catch (err) { next(err); }
};

exports.getWebhookDeliveries = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, event, response_code, response_body, success, delivered_at
       FROM webhook_deliveries WHERE webhook_id = $1
       ORDER BY delivered_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// ── PUBLIC API ──────────────────────────────────────────────────────────────

exports.publicUsers = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
              jr.name AS job_role,
              (SELECT COUNT(*) FROM employee_skills es WHERE es.user_id = u.id AND es.status = 'approved') AS approved_skills,
              (SELECT COUNT(*) FROM employee_certifications ec WHERE ec.user_id = u.id AND ec.status = 'approved') AS approved_certs
       FROM users u
       LEFT JOIN job_roles jr ON jr.id = u.job_role_id
       WHERE u.is_active = true
       ORDER BY u.last_name, u.first_name`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.publicSkills = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT es.id, es.user_id, u.first_name, u.last_name, u.email,
              sc.name AS skill_name, cat.name AS category, ms.name AS main_skill, jr.name AS job_role,
              es.weighting, es.reviewed_at AS approved_at
       FROM employee_skills es
       JOIN users u ON u.id = es.user_id
       JOIN skills_catalogue sc ON sc.id = es.skill_id
       LEFT JOIN skill_categories cat ON cat.id = sc.category_id
       LEFT JOIN main_skills ms ON ms.id = sc.main_skill_id
       LEFT JOIN job_roles jr ON jr.id = ms.job_role_id
       WHERE es.status = 'approved'
       ORDER BY u.last_name, sc.name`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.publicCertifications = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ec.id, ec.user_id, u.first_name, u.last_name, u.email,
              ec.name, ec.provider, ec.date_obtained, ec.expiration_date, ec.reviewed_at AS approved_at
       FROM employee_certifications ec
       JOIN users u ON u.id = ec.user_id
       WHERE ec.status = 'approved'
       ORDER BY u.last_name, ec.name`
    );
    res.json(rows);
  } catch (err) { next(err); }
};
