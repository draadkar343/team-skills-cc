const db = require('../config/db');

exports.listSquads = async (req, res, next) => {
  try {
    let query, params;
    if (req.user.role === 'administrator') {
      query = `SELECT s.*, u.first_name || ' ' || u.last_name AS manager_name,
               COUNT(sm.user_id) AS member_count
               FROM squads s
               JOIN users u ON u.id = s.manager_id
               LEFT JOIN squad_members sm ON sm.squad_id = s.id
               GROUP BY s.id, u.first_name, u.last_name ORDER BY s.name`;
      params = [];
    } else {
      query = `SELECT s.*, u.first_name || ' ' || u.last_name AS manager_name,
               COUNT(sm.user_id) AS member_count
               FROM squads s
               JOIN users u ON u.id = s.manager_id
               LEFT JOIN squad_members sm ON sm.squad_id = s.id
               WHERE s.manager_id = $1
               GROUP BY s.id, u.first_name, u.last_name ORDER BY s.name`;
      params = [req.user.id];
    }
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
};

exports.createSquad = async (req, res, next) => {
  try {
    const { name, managerId } = req.body;
    if (!name || !managerId) return res.status(400).json({ error: 'name and managerId required' });

    const { rows: mgr } = await db.query(
      "SELECT id FROM users WHERE id = $1 AND role IN ('manager','administrator') AND is_active = true",
      [managerId]
    );
    if (!mgr.length) return res.status(400).json({ error: 'Invalid manager ID' });

    const { rows } = await db.query(
      'INSERT INTO squads (name, manager_id) VALUES ($1, $2) RETURNING *',
      [name, managerId]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.getSquad = async (req, res, next) => {
  try {
    const { rows: squad } = await db.query(
      `SELECT s.*, u.first_name || ' ' || u.last_name AS manager_name
       FROM squads s JOIN users u ON u.id = s.manager_id WHERE s.id = $1`,
      [req.params.id]
    );
    if (!squad.length) return res.status(404).json({ error: 'Squad not found' });

    if (req.user.role === 'manager' && squad[0].manager_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your squad' });
    }

    const { rows: members } = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, sm.joined_at
       FROM squad_members sm JOIN users u ON u.id = sm.user_id
       WHERE sm.squad_id = $1 ORDER BY u.last_name`,
      [req.params.id]
    );
    res.json({ ...squad[0], members });
  } catch (err) { next(err); }
};

exports.updateSquad = async (req, res, next) => {
  try {
    const { name, managerId } = req.body;
    const { rows } = await db.query(
      `UPDATE squads SET
        name       = COALESCE($1, name),
        manager_id = COALESCE($2, manager_id),
        updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [name, managerId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Squad not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.addMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const { rows: squad } = await db.query('SELECT * FROM squads WHERE id = $1', [req.params.id]);
    if (!squad.length) return res.status(404).json({ error: 'Squad not found' });
    if (req.user.role === 'manager' && squad[0].manager_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your squad' });
    }

    const { rows: user } = await db.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'employee' AND is_active = true", [userId]
    );
    if (!user.length) return res.status(400).json({ error: 'User not found or not an employee' });

    await db.query(
      'INSERT INTO squad_members (squad_id, user_id) VALUES ($1, $2)',
      [req.params.id, userId]
    );
    res.status(201).json({ message: 'Member added' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Employee already in a squad' });
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { rows: squad } = await db.query('SELECT * FROM squads WHERE id = $1', [req.params.id]);
    if (!squad.length) return res.status(404).json({ error: 'Squad not found' });
    if (req.user.role === 'manager' && squad[0].manager_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your squad' });
    }

    await db.query(
      'DELETE FROM squad_members WHERE squad_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
};

exports.getMySquad = async (req, res, next) => {
  try {
    const { rows: squads } = await db.query(
      `SELECT s.*, u.first_name || ' ' || u.last_name AS manager_name
       FROM squads s JOIN users u ON u.id = s.manager_id
       WHERE s.manager_id = $1 ORDER BY s.name`,
      [req.user.id]
    );
    if (!squads.length) return res.json([]);

    const result = [];
    for (const squad of squads) {
      const { rows: members } = await db.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, sm.joined_at
         FROM squad_members sm JOIN users u ON u.id = sm.user_id
         WHERE sm.squad_id = $1 ORDER BY u.last_name`,
        [squad.id]
      );
      result.push({ ...squad, members });
    }
    res.json(result);
  } catch (err) { next(err); }
};

exports.deleteSquad = async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM squads WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Squad not found' });
    res.json({ message: 'Squad deleted' });
  } catch (err) { next(err); }
};

exports.listManagers = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, first_name, last_name, email FROM users
       WHERE role IN ('manager', 'administrator') AND is_active = true
       ORDER BY last_name, first_name`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getEmployeeSquad = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT s.id, s.name, u.first_name || ' ' || u.last_name AS manager_name,
              u.email AS manager_email
       FROM squad_members sm
       JOIN squads s ON s.id = sm.squad_id
       JOIN users u ON u.id = s.manager_id
       WHERE sm.user_id = $1`,
      [req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) { next(err); }
};

exports.getUnassignedEmployees = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name
       FROM users u
       WHERE u.role = 'employee' AND u.is_active = true
         AND NOT EXISTS (SELECT 1 FROM squad_members sm WHERE sm.user_id = u.id)
       ORDER BY u.last_name`
    );
    res.json(rows);
  } catch (err) { next(err); }
};
