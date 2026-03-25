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
