const db = require('../config/db');

// Helper: verify manager owns the squad member they're trying to allocate
async function isSquadMember(managerId, userId) {
  const { rows } = await db.query(
    `SELECT 1 FROM squad_members sm
     JOIN squads s ON s.id = sm.squad_id
     WHERE sm.user_id = $1 AND s.manager_id = $2 LIMIT 1`,
    [userId, managerId]
  );
  return rows.length > 0;
}

// Helper: verify manager created the client or is admin
async function canManageClient(req, clientId) {
  if (req.user.role === 'administrator') return true;
  const { rows } = await db.query(
    'SELECT id FROM clients WHERE id = $1 AND created_by = $2',
    [clientId, req.user.id]
  );
  return rows.length > 0;
}

// ── CLIENTS ────────────────────────────────────────────────────────────────

// GET /clients
exports.listClients = async (req, res, next) => {
  try {
    let rows;
    if (req.user.role === 'administrator' || req.user.role === 'resourcing') {
      ({ rows } = await db.query(
        `SELECT c.*, u.first_name || ' ' || u.last_name AS created_by_name
         FROM clients c
         JOIN users u ON u.id = c.created_by
         WHERE c.is_active = true
         ORDER BY c.name`
      ));
    } else {
      // Managers see clients they created OR clients that have one of their squad members allocated
      ({ rows } = await db.query(
        `SELECT DISTINCT c.*, u.first_name || ' ' || u.last_name AS created_by_name
         FROM clients c
         JOIN users u ON u.id = c.created_by
         WHERE c.is_active = true
           AND (
             c.created_by = $1
             OR c.id IN (
               SELECT ca.client_id FROM client_allocations ca
               JOIN squad_members sm ON sm.user_id = ca.user_id
               JOIN squads s ON s.id = sm.squad_id
               WHERE s.manager_id = $1
             )
           )
         ORDER BY c.name`,
        [req.user.id]
      ));
    }
    res.json(rows);
  } catch (err) { next(err); }
};

// POST /clients
exports.createClient = async (req, res, next) => {
  try {
    const { name, description, contactName, contactEmail } = req.body;
    if (!name) return res.status(400).json({ error: 'Client name is required' });
    const { rows } = await db.query(
      `INSERT INTO clients (name, description, contact_name, contact_email, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description || null, contactName || null, contactEmail || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

// PATCH /clients/:id
exports.updateClient = async (req, res, next) => {
  try {
    if (!await canManageClient(req, req.params.id)) {
      return res.status(403).json({ error: 'You can only edit clients you created' });
    }
    const { name, description, contactName, contactEmail } = req.body;
    const { rows } = await db.query(
      `UPDATE clients SET
        name          = COALESCE($1, name),
        description   = COALESCE($2, description),
        contact_name  = COALESCE($3, contact_name),
        contact_email = COALESCE($4, contact_email),
        updated_at    = NOW()
       WHERE id = $5 RETURNING *`,
      [name, description, contactName, contactEmail, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Client not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// DELETE /clients/:id  (soft-delete)
exports.deleteClient = async (req, res, next) => {
  try {
    if (!await canManageClient(req, req.params.id)) {
      return res.status(403).json({ error: 'You can only delete clients you created' });
    }
    await db.query(
      'UPDATE clients SET is_active = false, updated_at = NOW() WHERE id = $1',
      [req.params.id]
    );
    res.json({ message: 'Client deactivated' });
  } catch (err) { next(err); }
};

// ── ALLOCATIONS ────────────────────────────────────────────────────────────

// GET /clients/:id/allocations
exports.getClientAllocations = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ca.*, u.first_name, u.last_name, u.email
       FROM client_allocations ca
       JOIN users u ON u.id = ca.user_id
       WHERE ca.client_id = $1
       ORDER BY u.last_name, u.first_name`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// GET /clients/squad-overview  — each squad member + their total allocated % across all clients
exports.getSquadOverview = async (req, res, next) => {
  try {
    let memberRows, allocRows;

    if (req.user.role === 'administrator' || req.user.role === 'resourcing') {
      ({ rows: memberRows } = await db.query(
        `SELECT u.id, u.first_name || ' ' || u.last_name AS name, u.email
         FROM users u WHERE u.role = 'employee' AND u.is_active = true ORDER BY name`
      ));
      ({ rows: allocRows } = await db.query(
        `SELECT ca.user_id, ca.client_id, c.name AS client_name,
                ca.percentage, ca.start_date, ca.end_date, ca.notes, ca.id
         FROM client_allocations ca
         JOIN clients c ON c.id = ca.client_id
         WHERE c.is_active = true
         ORDER BY ca.user_id, c.name`
      ));
    } else {
      ({ rows: memberRows } = await db.query(
        `SELECT u.id, u.first_name || ' ' || u.last_name AS name, u.email
         FROM users u
         JOIN squad_members sm ON sm.user_id = u.id
         JOIN squads s ON s.id = sm.squad_id
         WHERE s.manager_id = $1 ORDER BY name`,
        [req.user.id]
      ));
      ({ rows: allocRows } = await db.query(
        `SELECT ca.user_id, ca.client_id, c.name AS client_name,
                ca.percentage, ca.start_date, ca.end_date, ca.notes, ca.id
         FROM client_allocations ca
         JOIN clients c ON c.id = ca.client_id
         JOIN squad_members sm ON sm.user_id = ca.user_id
         JOIN squads s ON s.id = sm.squad_id
         WHERE s.manager_id = $1 AND c.is_active = true
         ORDER BY ca.user_id, c.name`,
        [req.user.id]
      ));
    }

    // Group allocations by user
    const allocByUser = {};
    for (const a of allocRows) {
      if (!allocByUser[a.user_id]) allocByUser[a.user_id] = [];
      allocByUser[a.user_id].push(a);
    }

    const result = memberRows.map(m => ({
      ...m,
      allocations: allocByUser[m.id] || [],
      totalPercentage: (allocByUser[m.id] || []).reduce((sum, a) => sum + Number(a.percentage), 0),
    }));

    res.json(result);
  } catch (err) { next(err); }
};

// POST /clients/:id/allocations
exports.addAllocation = async (req, res, next) => {
  try {
    const { userId, percentage, startDate, endDate, notes } = req.body;
    if (!userId || percentage === undefined) {
      return res.status(400).json({ error: 'userId and percentage are required' });
    }
    if (percentage <= 0 || percentage > 100) {
      return res.status(400).json({ error: 'Percentage must be between 1 and 100' });
    }

    // Managers can only allocate their own squad members
    if (req.user.role === 'manager' && !await isSquadMember(req.user.id, userId)) {
      return res.status(403).json({ error: 'You can only allocate members of your squad' });
    }

    const { rows } = await db.query(
      `INSERT INTO client_allocations (client_id, user_id, percentage, start_date, end_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, userId, percentage, startDate || null, endDate || null, notes || null, req.user.id]
    );
    const { rows: detail } = await db.query(
      'SELECT first_name, last_name, email FROM users WHERE id = $1',
      [userId]
    );
    res.status(201).json({ ...rows[0], ...detail[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'This employee is already allocated to this client' });
    next(err);
  }
};

// PATCH /allocations/:id
exports.updateAllocation = async (req, res, next) => {
  try {
    const { percentage, startDate, endDate, notes } = req.body;
    if (percentage !== undefined && (percentage <= 0 || percentage > 100)) {
      return res.status(400).json({ error: 'Percentage must be between 1 and 100' });
    }

    // Verify manager owns this allocation (via squad) or is admin
    if (req.user.role === 'manager') {
      const { rows: check } = await db.query(
        `SELECT ca.id FROM client_allocations ca
         JOIN squad_members sm ON sm.user_id = ca.user_id
         JOIN squads s ON s.id = sm.squad_id
         WHERE ca.id = $1 AND s.manager_id = $2`,
        [req.params.id, req.user.id]
      );
      if (!check.length) return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await db.query(
      `UPDATE client_allocations SET
        percentage = COALESCE($1, percentage),
        start_date = CASE WHEN $2::boolean THEN $3::date ELSE start_date END,
        end_date   = CASE WHEN $4::boolean THEN $5::date ELSE end_date END,
        notes      = COALESCE($6, notes),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [percentage, startDate !== undefined, startDate || null,
       endDate !== undefined, endDate || null, notes, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Allocation not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// DELETE /allocations/:id
exports.deleteAllocation = async (req, res, next) => {
  try {
    if (req.user.role === 'manager') {
      const { rows: check } = await db.query(
        `SELECT ca.id FROM client_allocations ca
         JOIN squad_members sm ON sm.user_id = ca.user_id
         JOIN squads s ON s.id = sm.squad_id
         WHERE ca.id = $1 AND s.manager_id = $2`,
        [req.params.id, req.user.id]
      );
      if (!check.length) return res.status(403).json({ error: 'Access denied' });
    }
    await db.query('DELETE FROM client_allocations WHERE id = $1', [req.params.id]);
    res.json({ message: 'Allocation removed' });
  } catch (err) { next(err); }
};
