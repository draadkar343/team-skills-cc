const db = require('../config/db');

// ── JOB ROLES (admin manages) ─────────────────────────────────────────────

exports.listJobRoles = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT jr.*, COUNT(ms.id) AS main_skill_count
       FROM job_roles jr
       LEFT JOIN main_skills ms ON ms.job_role_id = jr.id
       GROUP BY jr.id ORDER BY jr.name`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.createJobRole = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Job role name required' });
    const { rows } = await db.query(
      'INSERT INTO job_roles (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Job role name already exists' });
    next(err);
  }
};

exports.updateJobRole = async (req, res, next) => {
  try {
    const { name, description, isActive } = req.body;
    const { rows } = await db.query(
      `UPDATE job_roles SET
        name        = COALESCE($1, name),
        description = COALESCE($2, description),
        is_active   = COALESCE($3, is_active),
        updated_at  = NOW()
       WHERE id = $4 RETURNING *`,
      [name, description, isActive, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Job role not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Job role name already exists' });
    next(err);
  }
};

exports.deleteJobRole = async (req, res, next) => {
  try {
    await db.query('DELETE FROM job_roles WHERE id = $1', [req.params.id]);
    res.json({ message: 'Job role deleted' });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'Cannot delete: job role has main skills or assigned users. Remove them first.' });
    next(err);
  }
};

// ── MAIN SKILLS (manager + admin manage) ─────────────────────────────────

exports.listMainSkills = async (req, res, next) => {
  try {
    const { jobRoleId } = req.query;
    const { rows } = await db.query(
      `SELECT ms.*, jr.name AS job_role_name,
              COUNT(sc.id) AS catalogue_skill_count
       FROM main_skills ms
       JOIN job_roles jr ON jr.id = ms.job_role_id
       LEFT JOIN skills_catalogue sc ON sc.main_skill_id = ms.id
       ${jobRoleId ? 'WHERE ms.job_role_id = $1' : ''}
       GROUP BY ms.id, jr.name
       ORDER BY jr.name, ms.name`,
      jobRoleId ? [jobRoleId] : []
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.createMainSkill = async (req, res, next) => {
  try {
    const { jobRoleId, name, description } = req.body;
    if (!jobRoleId || !name) return res.status(400).json({ error: 'jobRoleId and name required' });
    const { rows } = await db.query(
      'INSERT INTO main_skills (job_role_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [jobRoleId, name, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A main skill with this name already exists for that job role' });
    if (err.code === '23503') return res.status(404).json({ error: 'Job role not found' });
    next(err);
  }
};

exports.updateMainSkill = async (req, res, next) => {
  try {
    const { name, description, isActive } = req.body;
    const { rows } = await db.query(
      `UPDATE main_skills SET
        name        = COALESCE($1, name),
        description = COALESCE($2, description),
        is_active   = COALESCE($3, is_active),
        updated_at  = NOW()
       WHERE id = $4 RETURNING *`,
      [name, description, isActive, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Main skill not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Name already exists for this job role' });
    next(err);
  }
};

exports.deleteMainSkill = async (req, res, next) => {
  try {
    // Unlink catalogue skills first (SET NULL via DB constraint, but we confirm it's handled)
    await db.query('DELETE FROM main_skills WHERE id = $1', [req.params.id]);
    res.json({ message: 'Main skill deleted' });
  } catch (err) { next(err); }
};
