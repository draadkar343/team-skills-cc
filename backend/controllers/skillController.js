const db = require('../config/db');
const email = require('../services/emailService');

// Query the manager for a given employee user id (via squad membership)
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

// ── CATALOGUE ──────────────────────────────────────────────────────────────

exports.getCatalogue = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT sc.id, sc.name, sc.description, sc.is_active,
              sc.category_id, cat.name AS category_name,
              sc.main_skill_id, ms.name AS main_skill_name,
              ms.job_role_id, jr.name AS job_role_name
       FROM skills_catalogue sc
       LEFT JOIN skill_categories cat ON cat.id = sc.category_id
       LEFT JOIN main_skills ms ON ms.id = sc.main_skill_id
       LEFT JOIN job_roles jr ON jr.id = ms.job_role_id
       WHERE sc.is_active = true
       ORDER BY cat.name, sc.name`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getAllCatalogue = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT sc.id, sc.name, sc.description, sc.is_active,
              sc.category_id, cat.name AS category_name,
              sc.main_skill_id, ms.name AS main_skill_name,
              ms.job_role_id, jr.name AS job_role_name
       FROM skills_catalogue sc
       LEFT JOIN skill_categories cat ON cat.id = sc.category_id
       LEFT JOIN main_skills ms ON ms.id = sc.main_skill_id
       LEFT JOIN job_roles jr ON jr.id = ms.job_role_id
       ORDER BY cat.name, sc.name`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getCategories = async (_req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM skill_categories ORDER BY name');
    res.json(rows);
  } catch (err) { next(err); }
};

exports.createCatalogueSkill = async (req, res, next) => {
  try {
    const { name, description, categoryId, mainSkillId } = req.body;
    if (!name) return res.status(400).json({ error: 'Skill name required' });
    const { rows } = await db.query(
      'INSERT INTO skills_catalogue (name, description, category_id, main_skill_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, categoryId || null, mainSkillId || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.updateCatalogueSkill = async (req, res, next) => {
  try {
    const { name, description, categoryId, mainSkillId, isActive } = req.body;
    // Allow explicitly clearing main_skill_id by passing null
    const mainSkillValue = mainSkillId === null ? null : (mainSkillId || undefined);
    const { rows } = await db.query(
      `UPDATE skills_catalogue SET
        name          = COALESCE($1, name),
        description   = COALESCE($2, description),
        category_id   = COALESCE($3, category_id),
        main_skill_id = CASE WHEN $4::boolean THEN $5::integer ELSE main_skill_id END,
        is_active     = COALESCE($6, is_active)
       WHERE id = $7 RETURNING *`,
      [name, description, categoryId, mainSkillId !== undefined, mainSkillId ?? null, isActive, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Skill not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name required' });
    const { rows } = await db.query(
      'INSERT INTO skill_categories (name) VALUES ($1) RETURNING *', [name]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

// ── EMPLOYEE SKILLS ───────────────────────────────────────────────────────

exports.getMySkills = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT es.*, sc.name AS skill_name, sc.description AS skill_description,
              cat.name AS category_name,
              sc.main_skill_id, ms.name AS main_skill_name,
              ms.job_role_id, jr.name AS job_role_name,
              rv.first_name || ' ' || rv.last_name AS reviewed_by_name
       FROM employee_skills es
       JOIN skills_catalogue sc ON sc.id = es.skill_id
       LEFT JOIN skill_categories cat ON cat.id = sc.category_id
       LEFT JOIN main_skills ms ON ms.id = sc.main_skill_id
       LEFT JOIN job_roles jr ON jr.id = ms.job_role_id
       LEFT JOIN users rv ON rv.id = es.reviewed_by
       WHERE es.user_id = $1
       ORDER BY jr.name NULLS LAST, ms.name NULLS LAST, sc.name`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.addSkill = async (req, res, next) => {
  try {
    const { skillId, weighting, notes } = req.body;
    if (!skillId || weighting === undefined) return res.status(400).json({ error: 'skillId and weighting required' });
    const { rows } = await db.query(
      `INSERT INTO employee_skills (user_id, skill_id, weighting, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, skillId, weighting, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'You have already added this skill' });
    next(err);
  }
};

exports.updateMySkill = async (req, res, next) => {
  try {
    const { weighting, notes } = req.body;
    const { rows: existing } = await db.query(
      'SELECT * FROM employee_skills WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Skill not found' });
    if (!['draft', 'rejected'].includes(existing[0].status)) {
      return res.status(400).json({ error: 'Only draft or rejected skills can be edited' });
    }
    const { rows } = await db.query(
      `UPDATE employee_skills SET
        weighting  = COALESCE($1, weighting),
        notes      = COALESCE($2, notes),
        status     = 'draft',
        updated_at = NOW()
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [weighting, notes, req.params.id, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteMySkill = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT status FROM employee_skills WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Skill not found' });
    if (rows[0].status !== 'draft') return res.status(400).json({ error: 'Only draft skills can be deleted' });
    await db.query('DELETE FROM employee_skills WHERE id = $1', [req.params.id]);
    res.json({ message: 'Skill deleted' });
  } catch (err) { next(err); }
};

exports.submitSkill = async (req, res, next) => {
  try {
    const { rows: existing } = await db.query(
      'SELECT * FROM employee_skills WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Skill not found' });
    if (!['draft', 'rejected'].includes(existing[0].status)) {
      return res.status(400).json({ error: 'Skill is already submitted or approved' });
    }
    const { rows } = await db.query(
      `UPDATE employee_skills SET status = 'pending', submitted_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    await db.query(
      'INSERT INTO skill_workflow_history (employee_skill_id, changed_by, from_status, to_status) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.user.id, existing[0].status, 'pending']
    );
    // Notify manager
    const manager = await getManagerForUser(req.user.id);
    if (manager) {
      const { rows: emp } = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
      const { rows: sc } = await db.query('SELECT name FROM skills_catalogue WHERE id = $1', [existing[0].skill_id]);
      email.sendSkillsSubmitted(
        manager.email,
        manager.first_name,
        `${emp[0].first_name} ${emp[0].last_name}`,
        `${sc[0]?.name || 'a skill'}`
      );
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.submitAllSkills = async (req, res, next) => {
  try {
    const { rows: drafts } = await db.query(
      `SELECT id, status FROM employee_skills WHERE user_id = $1 AND status IN ('draft','rejected')`,
      [req.user.id]
    );
    if (!drafts.length) return res.status(400).json({ error: 'No draft or rejected skills to submit' });

    const ids = drafts.map(d => d.id);
    await db.query(
      `UPDATE employee_skills SET status = 'pending', submitted_at = NOW(), updated_at = NOW()
       WHERE id = ANY($1)`,
      [ids]
    );
    for (const d of drafts) {
      await db.query(
        'INSERT INTO skill_workflow_history (employee_skill_id, changed_by, from_status, to_status) VALUES ($1, $2, $3, $4)',
        [d.id, req.user.id, d.status, 'pending']
      );
    }
    // Notify manager once for the batch
    const manager = await getManagerForUser(req.user.id);
    if (manager) {
      const { rows: emp } = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
      email.sendSkillsSubmitted(
        manager.email,
        manager.first_name,
        `${emp[0].first_name} ${emp[0].last_name}`,
        ids.length
      );
    }
    res.json({ submitted: ids.length });
  } catch (err) { next(err); }
};

// ── MANAGER APPROVALS ─────────────────────────────────────────────────────

exports.getPendingSkills = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT es.*, u.first_name, u.last_name, u.email,
              sc.name AS skill_name, cat.name AS category_name
       FROM employee_skills es
       JOIN users u ON u.id = es.user_id
       JOIN skills_catalogue sc ON sc.id = es.skill_id
       LEFT JOIN skill_categories cat ON cat.id = sc.category_id
       JOIN squad_members sm ON sm.user_id = es.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE s.manager_id = $1 AND es.status = 'pending'
       ORDER BY es.submitted_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.approveSkill = async (req, res, next) => {
  try {
    const { rows: check } = await db.query(
      `SELECT es.id, es.status FROM employee_skills es
       JOIN squad_members sm ON sm.user_id = es.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE es.id = $1 AND s.manager_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!check.length) return res.status(404).json({ error: 'Skill not found in your squad' });
    if (check[0].status !== 'pending') return res.status(400).json({ error: 'Skill is not pending' });

    const { rows } = await db.query(
      `UPDATE employee_skills SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    await db.query(
      'INSERT INTO skill_workflow_history (employee_skill_id, changed_by, from_status, to_status) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.user.id, 'pending', 'approved']
    );
    // Notify employee
    const { rows: detail } = await db.query(
      `SELECT u.email, u.first_name, u.last_name, sc.name AS skill_name
       FROM employee_skills es
       JOIN users u ON u.id = es.user_id
       JOIN skills_catalogue sc ON sc.id = es.skill_id
       WHERE es.id = $1`,
      [req.params.id]
    );
    if (detail[0]) {
      const mgr = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
      email.sendSkillApproved(
        detail[0].email,
        detail[0].first_name,
        detail[0].skill_name,
        `${mgr.rows[0].first_name} ${mgr.rows[0].last_name}`
      );
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.rejectSkill = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Rejection reason required' });

    const { rows: check } = await db.query(
      `SELECT es.id, es.status FROM employee_skills es
       JOIN squad_members sm ON sm.user_id = es.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE es.id = $1 AND s.manager_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!check.length) return res.status(404).json({ error: 'Skill not found in your squad' });
    if (check[0].status !== 'pending') return res.status(400).json({ error: 'Skill is not pending' });

    const { rows } = await db.query(
      `UPDATE employee_skills SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
        rejection_reason = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [req.user.id, reason, req.params.id]
    );
    await db.query(
      'INSERT INTO skill_workflow_history (employee_skill_id, changed_by, from_status, to_status, comment) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, req.user.id, 'pending', 'rejected', reason]
    );
    // Notify employee
    const { rows: detail } = await db.query(
      `SELECT u.email, u.first_name, u.last_name, sc.name AS skill_name
       FROM employee_skills es
       JOIN users u ON u.id = es.user_id
       JOIN skills_catalogue sc ON sc.id = es.skill_id
       WHERE es.id = $1`,
      [req.params.id]
    );
    if (detail[0]) {
      const mgr = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
      email.sendSkillRejected(
        detail[0].email,
        detail[0].first_name,
        detail[0].skill_name,
        `${mgr.rows[0].first_name} ${mgr.rows[0].last_name}`,
        reason
      );
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.getAllSkills = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT es.*, u.first_name, u.last_name, u.email,
              sc.name AS skill_name, cat.name AS category_name,
              ms.name AS main_skill_name, jr.name AS job_role_name
       FROM employee_skills es
       JOIN users u ON u.id = es.user_id
       JOIN skills_catalogue sc ON sc.id = es.skill_id
       LEFT JOIN skill_categories cat ON cat.id = sc.category_id
       LEFT JOIN main_skills ms ON ms.id = sc.main_skill_id
       LEFT JOIN job_roles jr ON jr.id = ms.job_role_id
       ORDER BY jr.name NULLS LAST, ms.name NULLS LAST, u.last_name, sc.name`
    );
    res.json(rows);
  } catch (err) { next(err); }
};
