const crypto = require('crypto');
const db = require('../config/db');
const { hashPassword, comparePassword, signToken } = require('../services/authService');
const email = require('../services/emailService');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await db.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active, avatar_url FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await comparePassword(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user.id, user.role);
    res.json({
      token,
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, avatarUrl: user.avatar_url },
    });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar_url, u.biography,
              u.job_role_id, jr.name AS job_role_name
       FROM users u
       LEFT JOIN job_roles jr ON jr.id = u.job_role_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    const u = rows[0];
    res.json({
      id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name,
      role: u.role, avatarUrl: u.avatar_url, biography: u.biography,
      jobRoleId: u.job_role_id, jobRoleName: u.job_role_name,
    });
  } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, newEmail, biography, jobRoleId } = req.body;

    // Check for email conflict before updating
    if (newEmail) {
      const { rows: conflict } = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id <> $2',
        [newEmail.toLowerCase(), req.user.id]
      );
      if (conflict.length) return res.status(409).json({ error: 'Email already in use by another account' });
    }

    const { rows: before } = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const oldEmail = before[0].email;

    const { rows } = await db.query(
      `UPDATE users SET
        first_name  = COALESCE($1, first_name),
        last_name   = COALESCE($2, last_name),
        email       = COALESCE($3, email),
        biography   = COALESCE($4, biography),
        job_role_id = CASE WHEN $5::boolean THEN $6::integer ELSE job_role_id END,
        updated_at  = NOW()
       WHERE id = $7 RETURNING id, email, first_name, last_name, role, biography, job_role_id`,
      [firstName || null, lastName || null, newEmail ? newEmail.toLowerCase() : null,
       biography ?? null, jobRoleId !== undefined, jobRoleId ?? null, req.user.id]
    );
    const u = rows[0];

    // Notify the user if their email was changed
    if (newEmail && newEmail.toLowerCase() !== oldEmail) {
      email.sendEmailChanged(u.email, u.first_name, oldEmail);
    }

    res.json({ id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, role: u.role, biography: u.biography, jobRoleId: u.job_role_id });
  } catch (err) { next(err); }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = `/uploads/${req.file.filename}`;
    await db.query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [avatarUrl, req.user.id]);
    res.json({ avatarUrl });
  } catch (err) { next(err); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email: userEmail } = req.body;
    if (!userEmail) return res.status(400).json({ error: 'Email required' });

    // Always respond with success to prevent user enumeration
    const { rows } = await db.query(
      'SELECT id, first_name FROM users WHERE email = $1 AND is_active = true',
      [userEmail.toLowerCase()]
    );

    if (rows.length) {
      const user = rows[0];
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate any existing unused tokens for this user
      await db.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [user.id]
      );

      await db.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      );

      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      email.sendPasswordReset(userEmail.toLowerCase(), user.first_name, resetUrl);
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const { rows } = await db.query(
      `SELECT prt.id, prt.user_id FROM password_reset_tokens prt
       WHERE prt.token = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW()`,
      [token]
    );

    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired reset link.' });

    const { id: tokenId, user_id: userId } = rows[0];
    const newHash = await hashPassword(newPassword);

    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
    await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [tokenId]);

    res.json({ message: 'Password has been reset. You can now log in.' });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const match = await comparePassword(currentPassword, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password incorrect' });

    const newHash = await hashPassword(newPassword);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) { next(err); }
};
