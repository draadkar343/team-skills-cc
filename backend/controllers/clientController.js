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

// Helper: verify manager created the client or is admin/ADM
async function canManageClient(req, clientId) {
  if (req.user.role === 'administrator' || req.user.role === 'application_delivery_manager') return true;
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
    if (req.user.role === 'administrator' || req.user.role === 'resourcing' || req.user.role === 'application_delivery_manager') {
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

    if (req.user.role === 'administrator' || req.user.role === 'resourcing' || req.user.role === 'application_delivery_manager') {
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
    const { userId, percentage, startDate, endDate, notes, grade, soldRate, costRate } = req.body;
    if (!userId || percentage === undefined) {
      return res.status(400).json({ error: 'userId and percentage are required' });
    }
    if (percentage <= 0 || percentage > 100) {
      return res.status(400).json({ error: 'Percentage must be between 1 and 100' });
    }
    if (grade && !['A', 'B', 'C'].includes(grade)) {
      return res.status(400).json({ error: 'Grade must be A, B, or C' });
    }

    // Managers can only allocate their own squad members
    if (req.user.role === 'manager' && !await isSquadMember(req.user.id, userId)) {
      return res.status(403).json({ error: 'You can only allocate members of your squad' });
    }

    const { rows } = await db.query(
      `INSERT INTO client_allocations (client_id, user_id, percentage, start_date, end_date, notes, grade, sold_rate, cost_rate, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.params.id, userId, percentage, startDate || null, endDate || null, notes || null, grade || null,
       soldRate || null, costRate || null, req.user.id]
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
    const { percentage, startDate, endDate, notes, grade, soldRate, costRate } = req.body;
    if (percentage !== undefined && (percentage <= 0 || percentage > 100)) {
      return res.status(400).json({ error: 'Percentage must be between 1 and 100' });
    }
    if (grade !== undefined && grade !== null && !['A', 'B', 'C'].includes(grade)) {
      return res.status(400).json({ error: 'Grade must be A, B, or C' });
    }

    // Verify manager owns this allocation (via squad) or is admin/ADM
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
        grade      = CASE WHEN $8::boolean THEN $9::char ELSE grade END,
        sold_rate  = CASE WHEN $10::boolean THEN $11::numeric ELSE sold_rate END,
        cost_rate  = CASE WHEN $12::boolean THEN $13::numeric ELSE cost_rate END,
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [percentage, startDate !== undefined, startDate || null,
       endDate !== undefined, endDate || null, notes, req.params.id,
       grade !== undefined, grade || null,
       soldRate !== undefined, soldRate || null,
       costRate !== undefined, costRate || null]
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

// ── CLIENT SYSTEMS ──────────────────────────────────────────────────────────

const VALID_ENVS     = ['production', 'staging', 'development', 'uat'];
const VALID_STATUSES = ['active', 'deprecated', 'end_of_life'];

// GET /clients/:id/systems
exports.getClientSystems = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT cs.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM client_systems cs
       JOIN users u ON u.id = cs.created_by
       WHERE cs.client_id = $1
       ORDER BY cs.name, cs.environment`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// POST /clients/:id/systems
exports.addClientSystem = async (req, res, next) => {
  try {
    const { name, version, vendor, environment, status, supportExpiry, description, notes } = req.body;
    if (!name || !version) return res.status(400).json({ error: 'name and version are required' });
    const env = environment || 'production';
    const sts = status || 'active';
    if (!VALID_ENVS.includes(env))     return res.status(400).json({ error: 'Invalid environment' });
    if (!VALID_STATUSES.includes(sts)) return res.status(400).json({ error: 'Invalid status' });

    if (!await canManageClient(req, req.params.id)) {
      return res.status(403).json({ error: 'You can only add systems to clients you manage' });
    }

    const { rows } = await db.query(
      `INSERT INTO client_systems
         (client_id, name, version, vendor, environment, status, support_expiry, description, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.params.id, name, version, vendor || null, env, sts,
       supportExpiry || null, description || null, notes || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

// PATCH /clients/systems/:id
exports.updateClientSystem = async (req, res, next) => {
  try {
    const { name, version, vendor, environment, status, supportExpiry, description, notes } = req.body;
    if (environment && !VALID_ENVS.includes(environment))   return res.status(400).json({ error: 'Invalid environment' });
    if (status     && !VALID_STATUSES.includes(status))     return res.status(400).json({ error: 'Invalid status' });

    // Verify user can manage this system's client
    if (req.user.role !== 'administrator') {
      const { rows: check } = await db.query(
        `SELECT cs.id FROM client_systems cs
         JOIN clients c ON c.id = cs.client_id
         WHERE cs.id = $1 AND c.created_by = $2`,
        [req.params.id, req.user.id]
      );
      if (!check.length) return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await db.query(
      `UPDATE client_systems SET
         name           = COALESCE($1, name),
         version        = COALESCE($2, version),
         vendor         = COALESCE($3, vendor),
         environment    = COALESCE($4, environment),
         status         = COALESCE($5, status),
         support_expiry = CASE WHEN $6::boolean THEN $7::date ELSE support_expiry END,
         description    = COALESCE($8, description),
         notes          = COALESCE($9, notes),
         updated_at     = NOW()
       WHERE id = $10 RETURNING *`,
      [name, version, vendor, environment, status,
       supportExpiry !== undefined, supportExpiry || null,
       description, notes, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'System not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// DELETE /clients/systems/:id
exports.deleteClientSystem = async (req, res, next) => {
  try {
    if (req.user.role !== 'administrator') {
      const { rows: check } = await db.query(
        `SELECT cs.id FROM client_systems cs
         JOIN clients c ON c.id = cs.client_id
         WHERE cs.id = $1 AND c.created_by = $2`,
        [req.params.id, req.user.id]
      );
      if (!check.length) return res.status(403).json({ error: 'Access denied' });
    }
    await db.query('DELETE FROM client_systems WHERE id = $1', [req.params.id]);
    res.json({ message: 'System removed' });
  } catch (err) { next(err); }
};

// ── ROADMAP ─────────────────────────────────────────────────────────────────

// GET /clients/:id/roadmap
exports.getRoadmapItems = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ri.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM client_roadmap_items ri
       LEFT JOIN users u ON u.id = ri.created_by
       WHERE ri.client_id = $1
       ORDER BY ri.target_date NULLS LAST, ri.created_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// POST /clients/:id/roadmap
exports.addRoadmapItem = async (req, res, next) => {
  try {
    const { title, description, targetDate, status, priority } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    if (!await canManageClient(req, req.params.id)) return res.status(403).json({ error: 'Access denied' });
    const { rows } = await db.query(
      `INSERT INTO client_roadmap_items (client_id, title, description, target_date, status, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, title, description || null, targetDate || null, status || 'planned', priority || 'medium', req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

// PATCH /clients/roadmap/:id
exports.updateRoadmapItem = async (req, res, next) => {
  try {
    const { title, description, targetDate, status, priority } = req.body;
    const { rows: item } = await db.query(
      'SELECT client_id FROM client_roadmap_items WHERE id = $1', [req.params.id]
    );
    if (!item.length) return res.status(404).json({ error: 'Roadmap item not found' });
    if (!await canManageClient(req, item[0].client_id)) return res.status(403).json({ error: 'Access denied' });
    const { rows } = await db.query(
      `UPDATE client_roadmap_items SET
        title       = COALESCE($1, title),
        description = COALESCE($2, description),
        target_date = CASE WHEN $3::boolean THEN $4::date ELSE target_date END,
        status      = COALESCE($5, status),
        priority    = COALESCE($6, priority),
        updated_at  = NOW()
       WHERE id = $7 RETURNING *`,
      [title, description, targetDate !== undefined, targetDate || null, status, priority, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// DELETE /clients/roadmap/:id
exports.deleteRoadmapItem = async (req, res, next) => {
  try {
    const { rows: item } = await db.query(
      'SELECT client_id FROM client_roadmap_items WHERE id = $1', [req.params.id]
    );
    if (!item.length) return res.status(404).json({ error: 'Roadmap item not found' });
    if (!await canManageClient(req, item[0].client_id)) return res.status(403).json({ error: 'Access denied' });
    await db.query('DELETE FROM client_roadmap_items WHERE id = $1', [req.params.id]);
    res.json({ message: 'Roadmap item deleted' });
  } catch (err) { next(err); }
};

// ── CONTRACTS ───────────────────────────────────────────────────────────────

// GET /clients/:id/contracts
exports.getContracts = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT cc.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM client_contracts cc
       LEFT JOIN users u ON u.id = cc.created_by
       WHERE cc.client_id = $1
       ORDER BY cc.start_date DESC NULLS LAST, cc.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// POST /clients/:id/contracts
exports.addContract = async (req, res, next) => {
  try {
    const { title, contractNumber, type, startDate, endDate, value, currency, status, description, notes } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    if (!await canManageClient(req, req.params.id)) return res.status(403).json({ error: 'Access denied' });
    const { rows } = await db.query(
      `INSERT INTO client_contracts
         (client_id, title, contract_number, type, start_date, end_date, value, currency, status, description, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [req.params.id, title, contractNumber || null, type || null,
       startDate || null, endDate || null, value || null,
       currency || 'USD', status || 'active', description || null, notes || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

// PATCH /clients/contracts/:id
exports.updateContract = async (req, res, next) => {
  try {
    const { title, contractNumber, type, startDate, endDate, value, currency, status, description, notes } = req.body;
    const { rows: contract } = await db.query(
      'SELECT client_id FROM client_contracts WHERE id = $1', [req.params.id]
    );
    if (!contract.length) return res.status(404).json({ error: 'Contract not found' });
    if (!await canManageClient(req, contract[0].client_id)) return res.status(403).json({ error: 'Access denied' });
    const { rows } = await db.query(
      `UPDATE client_contracts SET
        title           = COALESCE($1, title),
        contract_number = COALESCE($2, contract_number),
        type            = COALESCE($3, type),
        start_date      = CASE WHEN $4::boolean THEN $5::date ELSE start_date END,
        end_date        = CASE WHEN $6::boolean THEN $7::date ELSE end_date END,
        value           = COALESCE($8, value),
        currency        = COALESCE($9, currency),
        status          = COALESCE($10, status),
        description     = COALESCE($11, description),
        notes           = COALESCE($12, notes),
        updated_at      = NOW()
       WHERE id = $13 RETURNING *`,
      [title, contractNumber, type,
       startDate !== undefined, startDate || null,
       endDate !== undefined, endDate || null,
       value, currency, status, description, notes, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// DELETE /clients/contracts/:id
exports.deleteContract = async (req, res, next) => {
  try {
    const { rows: contract } = await db.query(
      'SELECT client_id FROM client_contracts WHERE id = $1', [req.params.id]
    );
    if (!contract.length) return res.status(404).json({ error: 'Contract not found' });
    if (!await canManageClient(req, contract[0].client_id)) return res.status(403).json({ error: 'Access denied' });
    await db.query('DELETE FROM client_contracts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Contract deleted' });
  } catch (err) { next(err); }
};

// ── CHANGE REQUESTS ──────────────────────────────────────────────────────────

const VALID_CR_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

// GET /clients/:id/change-requests
exports.getChangeRequests = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ccr.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM client_change_requests ccr
       LEFT JOIN users u ON u.id = ccr.created_by
       WHERE ccr.client_id = $1
       ORDER BY ccr.expiry_date NULLS LAST, ccr.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// POST /clients/:id/change-requests
exports.addChangeRequest = async (req, res, next) => {
  try {
    const { title, description, quotedAmount, currency, status, expiryDate } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    if (status && !VALID_CR_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (!await canManageClient(req, req.params.id)) return res.status(403).json({ error: 'Access denied' });
    const { rows } = await db.query(
      `INSERT INTO client_change_requests
         (client_id, title, description, quoted_amount, currency, status, expiry_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.params.id, title, description || null,
       quotedAmount || null, currency || 'USD', status || 'pending',
       expiryDate || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

// PATCH /clients/change-requests/:id
exports.updateChangeRequest = async (req, res, next) => {
  try {
    const { title, description, quotedAmount, currency, status, expiryDate } = req.body;
    if (status !== undefined && !VALID_CR_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const { rows: cr } = await db.query(
      'SELECT client_id FROM client_change_requests WHERE id = $1', [req.params.id]
    );
    if (!cr.length) return res.status(404).json({ error: 'Change request not found' });
    if (!await canManageClient(req, cr[0].client_id)) return res.status(403).json({ error: 'Access denied' });
    const { rows } = await db.query(
      `UPDATE client_change_requests SET
        title         = COALESCE($1, title),
        description   = COALESCE($2, description),
        quoted_amount = COALESCE($3, quoted_amount),
        currency      = COALESCE($4, currency),
        status        = COALESCE($5, status),
        expiry_date   = CASE WHEN $6::boolean THEN $7::date ELSE expiry_date END,
        reminder_sent = CASE WHEN $6::boolean THEN false ELSE reminder_sent END,
        updated_at    = NOW()
       WHERE id = $8 RETURNING *`,
      [title, description, quotedAmount || null, currency, status,
       expiryDate !== undefined, expiryDate || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// DELETE /clients/change-requests/:id
exports.deleteChangeRequest = async (req, res, next) => {
  try {
    const { rows: cr } = await db.query(
      'SELECT client_id FROM client_change_requests WHERE id = $1', [req.params.id]
    );
    if (!cr.length) return res.status(404).json({ error: 'Change request not found' });
    if (!await canManageClient(req, cr[0].client_id)) return res.status(403).json({ error: 'Access denied' });
    await db.query('DELETE FROM client_change_requests WHERE id = $1', [req.params.id]);
    res.json({ message: 'Change request deleted' });
  } catch (err) { next(err); }
};
