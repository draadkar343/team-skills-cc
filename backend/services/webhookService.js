const https = require('https');
const http = require('http');
const crypto = require('crypto');
const db = require('../config/db');

async function deliver(hook, event, payload) {
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'X-Webhook-Event': event,
    'User-Agent': 'SkillsManagement-Webhook/1.0',
  };

  if (hook.secret) {
    headers['X-Webhook-Signature'] = crypto
      .createHmac('sha256', hook.secret)
      .update(body)
      .digest('hex');
  }

  let statusCode = null;
  let responseBody = null;
  let success = false;

  try {
    const url = new URL(hook.url);
    const lib = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers,
    };

    ({ statusCode, responseBody } = await new Promise((resolve, reject) => {
      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode, responseBody: data.slice(0, 500) }));
      });
      req.on('error', reject);
      req.setTimeout(10000, () => req.destroy(new Error('Request timed out after 10s')));
      req.write(body);
      req.end();
    }));

    success = statusCode >= 200 && statusCode < 300;
  } catch (err) {
    responseBody = err.message;
  }

  await db.query(
    `INSERT INTO webhook_deliveries (webhook_id, event, payload, response_code, response_body, success)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [hook.id, event, payload, statusCode, responseBody, success]
  ).catch(() => {});
}

// Fire all active webhooks subscribed to this event — non-blocking
exports.fire = (event, data) => {
  setImmediate(async () => {
    try {
      const { rows } = await db.query(
        `SELECT * FROM webhooks WHERE is_active = true AND $1 = ANY(events)`,
        [event]
      );
      for (const hook of rows) {
        const payload = { event, timestamp: new Date().toISOString(), data };
        deliver(hook, event, payload).catch(() => {});
      }
    } catch { /* never let webhook errors affect the main app */ }
  });
};
