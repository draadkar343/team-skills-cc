const db = require('../config/db');
const { createNotification } = require('../services/notificationService');
const { generateSuggestions } = require('../services/leaveSuggestionService');

// ---------------------------------------------------------------------------
// LEAVE TYPES (admin managed)
// ---------------------------------------------------------------------------

exports.listLeaveTypes = async (req, res, next) => {
  try {
    const activeOnly = req.query.active === 'true';
    const { rows } = await db.query(
      `SELECT lt.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM leave_types lt
       JOIN users u ON u.id = lt.created_by
       ${activeOnly ? "WHERE lt.is_active = true" : ""}
       ORDER BY lt.name`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.createLeaveType = async (req, res, next) => {
  try {
    const { name, description, colour } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const { rows } = await db.query(
      `INSERT INTO leave_types (name, description, colour, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), description || null, colour || '#3B82F6', req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A leave type with that name already exists' });
    next(err);
  }
};

exports.updateLeaveType = async (req, res, next) => {
  try {
    const { name, description, colour, is_active } = req.body;
    const { rows } = await db.query(
      `UPDATE leave_types
       SET name        = COALESCE($1, name),
           description = COALESCE($2, description),
           colour      = COALESCE($3, colour),
           is_active   = COALESCE($4, is_active),
           updated_at  = NOW()
       WHERE id = $5
       RETURNING *`,
      [name?.trim() || null, description ?? null, colour || null, is_active ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Leave type not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A leave type with that name already exists' });
    next(err);
  }
};

exports.deleteLeaveType = async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM leave_types WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Leave type not found' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'Cannot delete: leave requests exist for this type. Deactivate it instead.' });
    next(err);
  }
};

// ---------------------------------------------------------------------------
// LEAVE REQUESTS
// ---------------------------------------------------------------------------

// GET /leave/my — own leave, all roles
exports.getMyLeave = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT lr.*,
              lt.name AS leave_type_name, lt.colour AS leave_type_colour,
              rv.first_name || ' ' || rv.last_name AS reviewed_by_name
       FROM leave_requests lr
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       LEFT JOIN users rv ON rv.id = lr.reviewed_by
       WHERE lr.user_id = $1
       ORDER BY lr.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// POST /leave — create request, all roles
exports.createLeave = async (req, res, next) => {
  try {
    const { leaveTypeId, startDate, endDate, halfDay, reason } = req.body;

    if (!leaveTypeId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Leave type, start date, and end date are required' });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    // Calculate total days (simple calendar days, excluding weekends)
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) totalDays++;
      cur.setDate(cur.getDate() + 1);
    }
    if (halfDay) totalDays = Math.max(0.5, totalDays - 0.5);

    const { rows } = await db.query(
      `INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, half_day, total_days, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, leaveTypeId, startDate, endDate, halfDay || false, totalDays, reason || null]
    );
    const leave = rows[0];

    // Notify squad manager
    const { rows: squadRows } = await db.query(
      `SELECT s.manager_id, u.first_name || ' ' || u.last_name AS requester_name,
              lt.name AS type_name
       FROM squads s
       JOIN squad_members sm ON sm.squad_id = s.id
       JOIN users u ON u.id = sm.user_id
       JOIN leave_types lt ON lt.id = $2
       WHERE sm.user_id = $1 LIMIT 1`,
      [req.user.id, leaveTypeId]
    );
    if (squadRows.length) {
      const { manager_id, requester_name, type_name } = squadRows[0];
      await createNotification(
        manager_id,
        'leave_requested',
        `Leave request from ${requester_name}`,
        `${requester_name} has requested ${totalDays} day(s) of ${type_name} leave (${startDate} – ${endDate}).`
      );
    }

    res.status(201).json(leave);
  } catch (err) { next(err); }
};

// PATCH /leave/:id/cancel — cancel own pending request
exports.cancelLeave = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `UPDATE leave_requests
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Leave request not found or cannot be cancelled' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// GET /leave/pending — manager: squad pending leave
exports.getPendingLeave = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT lr.*,
              u.first_name || ' ' || u.last_name AS requester_name,
              u.avatar_url,
              lt.name AS leave_type_name, lt.colour AS leave_type_colour
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       JOIN squad_members sm ON sm.user_id = lr.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE s.manager_id = $1 AND lr.status = 'pending'
       ORDER BY lr.start_date ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// PATCH /leave/:id/approve — manager
exports.approveLeave = async (req, res, next) => {
  try {
    // Verify manager-employee relationship
    const { rows: check } = await db.query(
      `SELECT lr.user_id FROM leave_requests lr
       JOIN squad_members sm ON sm.user_id = lr.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE lr.id = $1 AND s.manager_id = $2 AND lr.status = 'pending'`,
      [req.params.id, req.user.id]
    );
    if (!check.length) return res.status(404).json({ error: 'Leave request not found or already actioned' });

    const { rows } = await db.query(
      `UPDATE leave_requests
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    const leave = rows[0];

    // Fetch type name for notification
    const { rows: typeRows } = await db.query(
      `SELECT lt.name, u.first_name || ' ' || u.last_name AS manager_name
       FROM leave_types lt, users u
       WHERE lt.id = $1 AND u.id = $2`,
      [leave.leave_type_id, req.user.id]
    );

    await createNotification(
      leave.user_id,
      'leave_approved',
      'Leave request approved',
      `Your ${typeRows[0]?.name || 'leave'} request (${leave.start_date?.toISOString?.().slice(0,10) || leave.start_date} – ${leave.end_date?.toISOString?.().slice(0,10) || leave.end_date}) has been approved by ${typeRows[0]?.manager_name || 'your manager'}.`
    );

    res.json(leave);
  } catch (err) { next(err); }
};

// PATCH /leave/:id/reject — manager
exports.rejectLeave = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'Rejection reason is required' });

    const { rows: check } = await db.query(
      `SELECT lr.user_id FROM leave_requests lr
       JOIN squad_members sm ON sm.user_id = lr.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE lr.id = $1 AND s.manager_id = $2 AND lr.status = 'pending'`,
      [req.params.id, req.user.id]
    );
    if (!check.length) return res.status(404).json({ error: 'Leave request not found or already actioned' });

    const { rows } = await db.query(
      `UPDATE leave_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
           rejection_reason = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [req.user.id, reason.trim(), req.params.id]
    );
    const leave = rows[0];

    const { rows: typeRows } = await db.query(
      `SELECT lt.name, u.first_name || ' ' || u.last_name AS manager_name
       FROM leave_types lt, users u
       WHERE lt.id = $1 AND u.id = $2`,
      [leave.leave_type_id, req.user.id]
    );

    await createNotification(
      leave.user_id,
      'leave_rejected',
      'Leave request rejected',
      `Your ${typeRows[0]?.name || 'leave'} request (${leave.start_date?.toISOString?.().slice(0,10) || leave.start_date} – ${leave.end_date?.toISOString?.().slice(0,10) || leave.end_date}) was rejected. Reason: ${reason.trim()}`
    );

    res.json(leave);
  } catch (err) { next(err); }
};

// GET /leave/team-calendar?month=YYYY-MM — approved leave for team (squad members + self)
exports.getTeamCalendar = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [year, mon] = month.split('-');
    const startOfMonth = `${year}-${mon}-01`;
    const endOfMonth = new Date(Number(year), Number(mon), 0).toISOString().slice(0, 10);

    let userFilter;
    let params;

    if (req.user.role === 'manager') {
      // Manager sees own squad + themselves
      userFilter = `
        (lr.user_id = $3
         OR lr.user_id IN (
           SELECT sm.user_id FROM squad_members sm
           JOIN squads s ON s.id = sm.squad_id
           WHERE s.manager_id = $3
         ))`;
      params = [startOfMonth, endOfMonth, req.user.id];
    } else if (req.user.role === 'administrator' || req.user.role === 'resourcing') {
      // Admin/resourcing see everyone
      userFilter = 'TRUE';
      params = [startOfMonth, endOfMonth];
    } else {
      // Employee sees own squad
      userFilter = `
        lr.user_id IN (
          SELECT sm2.user_id FROM squad_members sm2
          WHERE sm2.squad_id = (
            SELECT squad_id FROM squad_members WHERE user_id = $3 LIMIT 1
          )
        )`;
      params = [startOfMonth, endOfMonth, req.user.id];
    }

    const { rows } = await db.query(
      `SELECT lr.id, lr.user_id, lr.start_date, lr.end_date, lr.half_day, lr.total_days,
              lr.status, lr.reason,
              u.first_name || ' ' || u.last_name AS employee_name, u.avatar_url,
              lt.name AS leave_type_name, lt.colour AS leave_type_colour
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.status IN ('approved', 'pending')
         AND lr.start_date <= $2
         AND lr.end_date >= $1
         AND ${userFilter}
       ORDER BY lr.start_date ASC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// GET /leave/suggestions — AI-powered annual leave suggestions
exports.getSuggestions = async (req, res, next) => {
  try {
    // Use country_code from query param, or fall back to user's profile
    let countryCode = req.query.countryCode;
    if (!countryCode) {
      const { rows } = await db.query('SELECT country_code FROM users WHERE id = $1', [req.user.id]);
      countryCode = rows[0]?.country_code || 'GB';
    }
    const suggestions = await generateSuggestions(countryCode);
    res.json({ countryCode: countryCode.toUpperCase(), suggestions });
  } catch (err) {
    console.error('[leaveSuggestions] error:', err.message);
    next(err);
  }
};

// GET /leave/all — admin: all leave requests with filters
exports.getAllLeave = async (req, res, next) => {
  try {
    const { status, month } = req.query;
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`lr.status = $${params.length}`);
    }
    if (month) {
      const [year, mon] = month.split('-');
      const startOfMonth = `${year}-${mon}-01`;
      const endOfMonth = new Date(Number(year), Number(mon), 0).toISOString().slice(0, 10);
      params.push(startOfMonth, endOfMonth);
      conditions.push(`lr.start_date <= $${params.length} AND lr.end_date >= $${params.length - 1}`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const { rows } = await db.query(
      `SELECT lr.*,
              u.first_name || ' ' || u.last_name AS requester_name, u.avatar_url,
              lt.name AS leave_type_name, lt.colour AS leave_type_colour,
              rv.first_name || ' ' || rv.last_name AS reviewed_by_name
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       LEFT JOIN users rv ON rv.id = lr.reviewed_by
       ${where}
       ORDER BY lr.created_at DESC
       LIMIT 500`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
};
