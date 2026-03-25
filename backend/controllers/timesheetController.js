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

async function syncTotalHours(timesheetId) {
  await db.query(
    `UPDATE timesheets SET total_hours = (
       SELECT COALESCE(SUM(hours), 0) FROM timesheet_entries WHERE timesheet_id = $1
     ), updated_at = NOW() WHERE id = $1`,
    [timesheetId]
  );
}

// ── EMPLOYEE ──────────────────────────────────────────────────────────────

exports.getMyTimesheets = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*,
              rv.first_name || ' ' || rv.last_name AS reviewed_by_name
       FROM timesheets t
       LEFT JOIN users rv ON rv.id = t.reviewed_by
       WHERE t.user_id = $1
       ORDER BY t.week_start_date DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.createTimesheet = async (req, res, next) => {
  try {
    const { weekStartDate, notes } = req.body;
    if (!weekStartDate) return res.status(400).json({ error: 'weekStartDate required' });

    const { rows } = await db.query(
      'INSERT INTO timesheets (user_id, week_start_date, notes) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, weekStartDate, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Timesheet for this week already exists' });
    next(err);
  }
};

exports.getTimesheet = async (req, res, next) => {
  try {
    const { rows: ts } = await db.query('SELECT * FROM timesheets WHERE id = $1', [req.params.id]);
    if (!ts.length) return res.status(404).json({ error: 'Timesheet not found' });

    const t = ts[0];
    // Employee can only see own; manager must be in the chain
    if (req.user.role === 'employee' && t.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows: entries } = await db.query(
      'SELECT * FROM timesheet_entries WHERE timesheet_id = $1 ORDER BY work_date',
      [req.params.id]
    );
    res.json({ ...t, entries });
  } catch (err) { next(err); }
};

exports.updateTimesheet = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const { rows: existing } = await db.query(
      'SELECT * FROM timesheets WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Timesheet not found' });
    if (!['draft', 'rejected'].includes(existing[0].status)) {
      return res.status(400).json({ error: 'Cannot edit a submitted or approved timesheet' });
    }
    const { rows } = await db.query(
      'UPDATE timesheets SET notes = COALESCE($1, notes), updated_at = NOW() WHERE id = $2 RETURNING *',
      [notes, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteTimesheet = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT status FROM timesheets WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Timesheet not found' });
    if (rows[0].status !== 'draft') return res.status(400).json({ error: 'Only draft timesheets can be deleted' });
    await db.query('DELETE FROM timesheets WHERE id = $1', [req.params.id]);
    res.json({ message: 'Timesheet deleted' });
  } catch (err) { next(err); }
};

exports.submitTimesheet = async (req, res, next) => {
  try {
    const { rows: existing } = await db.query(
      'SELECT * FROM timesheets WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Timesheet not found' });
    if (!['draft', 'rejected'].includes(existing[0].status)) {
      return res.status(400).json({ error: 'Timesheet already submitted or approved' });
    }
    const { rows } = await db.query(
      `UPDATE timesheets SET status = 'pending', submitted_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    // Notify manager
    const manager = await getManagerForUser(req.user.id);
    if (manager) {
      const { rows: emp } = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
      email.sendTimesheetSubmitted(
        manager.email,
        manager.first_name,
        `${emp[0].first_name} ${emp[0].last_name}`,
        String(existing[0].week_start_date).slice(0, 10),
        existing[0].total_hours
      );
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// ── ENTRIES ───────────────────────────────────────────────────────────────

exports.addEntry = async (req, res, next) => {
  try {
    const { workDate, hours, projectCode, description } = req.body;
    if (!workDate || hours === undefined) return res.status(400).json({ error: 'workDate and hours required' });

    const { rows: ts } = await db.query(
      'SELECT * FROM timesheets WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!ts.length) return res.status(404).json({ error: 'Timesheet not found' });
    if (!['draft', 'rejected'].includes(ts[0].status)) {
      return res.status(400).json({ error: 'Cannot modify a submitted timesheet' });
    }

    const { rows } = await db.query(
      'INSERT INTO timesheet_entries (timesheet_id, work_date, hours, project_code, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.params.id, workDate, hours, projectCode || null, description || null]
    );
    await syncTotalHours(req.params.id);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.updateEntry = async (req, res, next) => {
  try {
    const { hours, projectCode, description } = req.body;
    const { rows: ts } = await db.query(
      `SELECT t.status FROM timesheets t
       JOIN timesheet_entries te ON te.timesheet_id = t.id
       WHERE te.id = $1 AND t.user_id = $2`,
      [req.params.entryId, req.user.id]
    );
    if (!ts.length) return res.status(404).json({ error: 'Entry not found' });
    if (!['draft', 'rejected'].includes(ts[0].status)) {
      return res.status(400).json({ error: 'Cannot modify a submitted timesheet' });
    }
    const { rows } = await db.query(
      `UPDATE timesheet_entries SET
        hours        = COALESCE($1, hours),
        project_code = COALESCE($2, project_code),
        description  = COALESCE($3, description)
       WHERE id = $4 RETURNING *`,
      [hours, projectCode, description, req.params.entryId]
    );
    await syncTotalHours(req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteEntry = async (req, res, next) => {
  try {
    const { rows: ts } = await db.query(
      `SELECT t.status FROM timesheets t
       JOIN timesheet_entries te ON te.timesheet_id = t.id
       WHERE te.id = $1 AND t.user_id = $2`,
      [req.params.entryId, req.user.id]
    );
    if (!ts.length) return res.status(404).json({ error: 'Entry not found' });
    if (!['draft', 'rejected'].includes(ts[0].status)) {
      return res.status(400).json({ error: 'Cannot modify a submitted timesheet' });
    }
    await db.query('DELETE FROM timesheet_entries WHERE id = $1', [req.params.entryId]);
    await syncTotalHours(req.params.id);
    res.json({ message: 'Entry deleted' });
  } catch (err) { next(err); }
};

// ── MANAGER APPROVALS ─────────────────────────────────────────────────────

exports.getPendingTimesheets = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, u.first_name, u.last_name, u.email
       FROM timesheets t
       JOIN users u ON u.id = t.user_id
       JOIN squad_members sm ON sm.user_id = t.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE s.manager_id = $1 AND t.status = 'pending'
       ORDER BY t.submitted_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.approveTimesheet = async (req, res, next) => {
  try {
    const { rows: check } = await db.query(
      `SELECT t.id, t.status FROM timesheets t
       JOIN squad_members sm ON sm.user_id = t.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE t.id = $1 AND s.manager_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!check.length) return res.status(404).json({ error: 'Timesheet not found in your squad' });
    if (check[0].status !== 'pending') return res.status(400).json({ error: 'Timesheet is not pending' });

    const { rows } = await db.query(
      `UPDATE timesheets SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    // Notify employee
    const { rows: detail } = await db.query(
      `SELECT u.email, u.first_name, t.week_start_date
       FROM timesheets t JOIN users u ON u.id = t.user_id WHERE t.id = $1`,
      [req.params.id]
    );
    if (detail[0]) {
      const mgr = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
      email.sendTimesheetApproved(
        detail[0].email,
        detail[0].first_name,
        String(detail[0].week_start_date).slice(0, 10),
        `${mgr.rows[0].first_name} ${mgr.rows[0].last_name}`
      );
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.rejectTimesheet = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Rejection reason required' });

    const { rows: check } = await db.query(
      `SELECT t.id, t.status FROM timesheets t
       JOIN squad_members sm ON sm.user_id = t.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE t.id = $1 AND s.manager_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!check.length) return res.status(404).json({ error: 'Timesheet not found in your squad' });
    if (check[0].status !== 'pending') return res.status(400).json({ error: 'Timesheet is not pending' });

    const { rows } = await db.query(
      `UPDATE timesheets SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
        rejection_reason = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [req.user.id, reason, req.params.id]
    );
    // Notify employee
    const { rows: detail } = await db.query(
      `SELECT u.email, u.first_name, t.week_start_date
       FROM timesheets t JOIN users u ON u.id = t.user_id WHERE t.id = $1`,
      [req.params.id]
    );
    if (detail[0]) {
      const mgr = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
      email.sendTimesheetRejected(
        detail[0].email,
        detail[0].first_name,
        String(detail[0].week_start_date).slice(0, 10),
        `${mgr.rows[0].first_name} ${mgr.rows[0].last_name}`,
        reason
      );
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.bulkApproveTimesheets = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: 'ids array required' });
    }

    // Only approve timesheets that belong to this manager's squad and are pending
    const { rows: valid } = await db.query(
      `SELECT t.id FROM timesheets t
       JOIN squad_members sm ON sm.user_id = t.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE t.id = ANY($1) AND s.manager_id = $2 AND t.status = 'pending'`,
      [ids, req.user.id]
    );
    if (!valid.length) return res.status(404).json({ error: 'No valid pending timesheets found' });

    const validIds = valid.map(r => r.id);
    await db.query(
      `UPDATE timesheets SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = ANY($2)`,
      [req.user.id, validIds]
    );

    const mgr = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
    const mgrName = `${mgr.rows[0].first_name} ${mgr.rows[0].last_name}`;
    const { rows: details } = await db.query(
      `SELECT u.email, u.first_name, t.week_start_date
       FROM timesheets t JOIN users u ON u.id = t.user_id WHERE t.id = ANY($1)`,
      [validIds]
    );
    for (const d of details) {
      email.sendTimesheetApproved(d.email, d.first_name, String(d.week_start_date).slice(0, 10), mgrName);
    }

    res.json({ approved: validIds.length, skipped: ids.length - validIds.length });
  } catch (err) { next(err); }
};

exports.getAllTimesheets = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, u.first_name, u.last_name, u.email
       FROM timesheets t
       JOIN users u ON u.id = t.user_id
       ORDER BY t.week_start_date DESC, u.last_name`
    );
    res.json(rows);
  } catch (err) { next(err); }
};
