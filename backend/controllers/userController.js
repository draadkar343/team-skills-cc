const db = require('../config/db');
const { hashPassword } = require('../services/authService');
const email = require('../services/emailService');
const webhook = require('../services/webhookService');

exports.listUsers = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at,
              u.job_role_id, jr.name AS job_role_name
       FROM users u
       LEFT JOIN job_roles jr ON jr.id = u.job_role_id
       ORDER BY u.last_name, u.first_name`
    );
    res.json(rows.map(u => ({ id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, role: u.role, isActive: u.is_active, createdAt: u.created_at, jobRoleId: u.job_role_id, jobRoleName: u.job_role_name })));
  } catch (err) { next(err); }
};

exports.createUser = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    if (!email || !password || !firstName || !lastName) return res.status(400).json({ error: 'All fields required' });

    // All new users are always created as employees; role is assigned later by admins only
    const hash = await hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, 'employee') RETURNING id, email, first_name, last_name, role`,
      [email.toLowerCase(), hash, firstName, lastName]
    );
    const u = rows[0];
    email.sendWelcome(u.email, u.first_name, password);
    webhook.fire('user.created', { userId: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, role: u.role });
    res.status(201).json({ id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, role: u.role });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active,
              u.date_of_birth, u.job_role_id, jr.name AS job_role_name
       FROM users u
       LEFT JOIN job_roles jr ON jr.id = u.job_role_id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    res.json({ id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, role: u.role, isActive: u.is_active, dateOfBirth: u.date_of_birth, jobRoleId: u.job_role_id, jobRoleName: u.job_role_name });
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { firstName, lastName, role, isActive, dateOfBirth, jobRoleId } = req.body;

    // Only admins may change a user's role
    const roleValue = req.user.role === 'administrator' ? (role || null) : null;

    const { rows } = await db.query(
      `UPDATE users SET
        first_name    = COALESCE($1, first_name),
        last_name     = COALESCE($2, last_name),
        role          = COALESCE($3::user_role, role),
        is_active     = COALESCE($4, is_active),
        date_of_birth = CASE WHEN $5::boolean THEN $6::date ELSE date_of_birth END,
        job_role_id   = CASE WHEN $7::boolean THEN $8::integer ELSE job_role_id END,
        updated_at    = NOW()
       WHERE id = $9 RETURNING id, email, first_name, last_name, role, is_active, date_of_birth, job_role_id`,
      [firstName, lastName, roleValue, isActive,
       dateOfBirth !== undefined, dateOfBirth || null,
       jobRoleId !== undefined, jobRoleId ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    res.json({ id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, role: u.role, isActive: u.is_active, dateOfBirth: u.date_of_birth, jobRoleId: u.job_role_id });
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await db.query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deactivated' });
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const hash = await hashPassword(newPassword);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.params.id]);
    res.json({ message: 'Password reset' });
  } catch (err) { next(err); }
};

// ── BULK IMPORT ────────────────────────────────────────────────────────────

function parseCsv(buffer) {
  const lines = buffer.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const fields = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) { fields.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    fields.push(cur.trim());
    rows.push(fields);
  }
  return rows;
}

// POST /users/bulk-import  CSV: first_name, last_name, email, password, role (optional)
exports.bulkImport = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });
    const rows = parseCsv(req.file.buffer);
    if (!rows.length) return res.status(400).json({ error: 'CSV is empty' });

    const headers = rows[0].map(h => h.toLowerCase());
    const isHeader = headers.includes('first_name') || headers.includes('email');
    const dataRows = isHeader ? rows.slice(1) : rows;

    let inserted = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const [firstName, lastName, emailVal, password] = dataRows[i];
      const rowNum = i + (isHeader ? 2 : 1);

      if (!firstName || !lastName || !emailVal || !password) {
        errors.push(`Row ${rowNum}: first_name, last_name, email and password are required`);
        continue;
      }
      if (password.length < 8) {
        errors.push(`Row ${rowNum}: password must be at least 8 characters`);
        continue;
      }

      try {
        const hash = await hashPassword(password);
        const { rows: created } = await db.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, role)
           VALUES ($1, $2, $3, $4, 'employee') RETURNING id, email, first_name`,
          [emailVal.toLowerCase(), hash, firstName, lastName]
        );
        email.sendWelcome(created[0].email, created[0].first_name, password);
        inserted++;
      } catch (err) {
        if (err.code === '23505') { skipped++; }
        else errors.push(`Row ${rowNum}: ${err.message}`);
      }
    }

    res.json({ inserted, skipped, errors });
  } catch (err) { next(err); }
};
