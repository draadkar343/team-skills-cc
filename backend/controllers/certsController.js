const db = require('../config/db');
const email = require('../services/emailService');

async function getManagerForUser(userId) {
  const { rows } = await db.query(
    `SELECT u.email, u.first_name, u.last_name
     FROM users u
     JOIN squads s ON s.manager_id = u.id
     JOIN squad_members sm ON sm.squad_id = s.id
     WHERE sm.user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

// ── EMPLOYEE ────────────────────────────────────────────────────────────────

exports.getMyCerts = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ec.*, rv.first_name || ' ' || rv.last_name AS reviewed_by_name
       FROM employee_certifications ec
       LEFT JOIN users rv ON rv.id = ec.reviewed_by
       WHERE ec.user_id = $1
       ORDER BY ec.date_obtained DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.addCert = async (req, res, next) => {
  try {
    const { name, provider, dateObtained, expirationDate, notes } = req.body;
    if (!name || !dateObtained) return res.status(400).json({ error: 'Name and date obtained are required' });
    const certUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const { rows } = await db.query(
      `INSERT INTO employee_certifications
         (user_id, name, provider, date_obtained, expiration_date, certificate_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, name, provider || null, dateObtained, expirationDate || null, certUrl, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.updateCert = async (req, res, next) => {
  try {
    const { name, provider, dateObtained, expirationDate, notes } = req.body;
    const { rows: existing } = await db.query(
      'SELECT * FROM employee_certifications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Certification not found' });
    if (!['draft', 'rejected'].includes(existing[0].status)) {
      return res.status(403).json({ error: 'Only draft or rejected certifications can be edited' });
    }
    const certUrl = req.file ? `/uploads/${req.file.filename}` : existing[0].certificate_url;
    const { rows } = await db.query(
      `UPDATE employee_certifications SET
        name            = COALESCE($1, name),
        provider        = COALESCE($2, provider),
        date_obtained   = COALESCE($3, date_obtained),
        expiration_date = $4,
        certificate_url = $5,
        notes           = COALESCE($6, notes),
        status          = 'draft',
        updated_at      = NOW()
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [name || null, provider || null, dateObtained || null, expirationDate || null, certUrl, notes || null, req.params.id, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteCert = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `DELETE FROM employee_certifications WHERE id = $1 AND user_id = $2 AND status = 'draft' RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Certification not found or cannot be deleted' });
    res.json({ deleted: rows[0].id });
  } catch (err) { next(err); }
};

exports.submitCert = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `UPDATE employee_certifications SET status = 'pending', submitted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status IN ('draft', 'rejected') RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Certification not found or not in a submittable state' });

    const cert = rows[0];
    const [userRow, manager] = await Promise.all([
      db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]),
      getManagerForUser(req.user.id),
    ]);
    if (manager) {
      const empName = `${userRow.rows[0].first_name} ${userRow.rows[0].last_name}`;
      email.sendCertSubmitted(manager.email, manager.first_name, empName, cert.name);
    }
    res.json(cert);
  } catch (err) { next(err); }
};

// ── MANAGER ─────────────────────────────────────────────────────────────────

exports.getPendingCerts = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ec.*, u.first_name, u.last_name, u.email
       FROM employee_certifications ec
       JOIN users u ON u.id = ec.user_id
       JOIN squad_members sm ON sm.user_id = ec.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE s.manager_id = $1 AND ec.status = 'pending'
       ORDER BY ec.submitted_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.approveCert = async (req, res, next) => {
  try {
    const { rows: valid } = await db.query(
      `SELECT ec.id FROM employee_certifications ec
       JOIN squad_members sm ON sm.user_id = ec.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE ec.id = $1 AND s.manager_id = $2 AND ec.status = 'pending'`,
      [req.params.id, req.user.id]
    );
    if (!valid.length) return res.status(404).json({ error: 'Certification not found or not pending' });

    const { rows } = await db.query(
      `UPDATE employee_certifications SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    const cert = rows[0];

    const [mgrRow, empRow] = await Promise.all([
      db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]),
      db.query('SELECT first_name, email FROM users WHERE id = $1', [cert.user_id]),
    ]);
    email.sendCertApproved(
      empRow.rows[0].email, empRow.rows[0].first_name, cert.name,
      `${mgrRow.rows[0].first_name} ${mgrRow.rows[0].last_name}`
    );
    res.json(cert);
  } catch (err) { next(err); }
};

exports.rejectCert = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Rejection reason required' });

    const { rows: valid } = await db.query(
      `SELECT ec.id FROM employee_certifications ec
       JOIN squad_members sm ON sm.user_id = ec.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE ec.id = $1 AND s.manager_id = $2 AND ec.status = 'pending'`,
      [req.params.id, req.user.id]
    );
    if (!valid.length) return res.status(404).json({ error: 'Certification not found or not pending' });

    const { rows } = await db.query(
      `UPDATE employee_certifications SET status = 'rejected', rejection_reason = $1,
        reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [reason, req.user.id, req.params.id]
    );
    const cert = rows[0];

    const [mgrRow, empRow] = await Promise.all([
      db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]),
      db.query('SELECT first_name, email FROM users WHERE id = $1', [cert.user_id]),
    ]);
    email.sendCertRejected(
      empRow.rows[0].email, empRow.rows[0].first_name, cert.name,
      `${mgrRow.rows[0].first_name} ${mgrRow.rows[0].last_name}`, reason
    );
    res.json(cert);
  } catch (err) { next(err); }
};

// ── ADMIN ────────────────────────────────────────────────────────────────────

exports.getAllCerts = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ec.*, u.first_name, u.last_name, u.email,
              rv.first_name || ' ' || rv.last_name AS reviewed_by_name
       FROM employee_certifications ec
       JOIN users u ON u.id = ec.user_id
       LEFT JOIN users rv ON rv.id = ec.reviewed_by
       ORDER BY ec.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
};
