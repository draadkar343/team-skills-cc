const db = require('../config/db');
const email = require('../services/emailService');
const webhook = require('../services/webhookService');
const { createNotification } = require('../services/notificationService');

// Query the manager for a given employee user id (via squad membership)
async function getManagerForUser(userId) {
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.first_name, u.last_name
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
      createNotification(manager.id, 'skill_submitted', 'Skill Pending Approval',
        `${emp[0].first_name} ${emp[0].last_name} submitted "${sc[0]?.name || 'a skill'}" for approval.`);
    }
    const { rows: sc } = await db.query(
      `SELECT sc.name, cat.name AS category FROM skills_catalogue sc LEFT JOIN skill_categories cat ON cat.id = sc.category_id WHERE sc.id = $1`,
      [existing[0].skill_id]
    );
    const { rows: emp } = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
    webhook.fire('skill.submitted', {
      skillId: rows[0].id, userId: req.user.id,
      userName: `${emp[0].first_name} ${emp[0].last_name}`,
      skillName: sc[0]?.name, category: sc[0]?.category, weighting: rows[0].weighting,
    });
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
      createNotification(manager.id, 'skill_submitted', 'Skills Pending Approval',
        `${emp[0].first_name} ${emp[0].last_name} submitted ${ids.length} skill(s) for approval.`);
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
      const mgrName = `${mgr.rows[0].first_name} ${mgr.rows[0].last_name}`;
      email.sendSkillApproved(detail[0].email, detail[0].first_name, detail[0].skill_name, mgrName);
      createNotification(rows[0].user_id, 'skill_approved', 'Skill Approved',
        `Your skill "${detail[0].skill_name}" has been approved by ${mgrName}.`);
      webhook.fire('skill.approved', {
        skillId: rows[0].id, userId: rows[0].user_id,
        userName: `${detail[0].first_name} ${detail[0].last_name}`,
        skillName: detail[0].skill_name, weighting: rows[0].weighting, approvedBy: mgrName,
      });
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
      const mgrName = `${mgr.rows[0].first_name} ${mgr.rows[0].last_name}`;
      email.sendSkillRejected(detail[0].email, detail[0].first_name, detail[0].skill_name, mgrName, reason);
      createNotification(rows[0].user_id, 'skill_rejected', 'Skill Rejected',
        `Your skill "${detail[0].skill_name}" was rejected by ${mgrName}. Reason: ${reason}`);
      webhook.fire('skill.rejected', {
        skillId: rows[0].id, userId: rows[0].user_id,
        userName: `${detail[0].first_name} ${detail[0].last_name}`,
        skillName: detail[0].skill_name, reason, rejectedBy: mgrName,
      });
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.bulkApproveSkills = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: 'ids array required' });
    }

    // Only approve skills that belong to this manager's squad and are pending
    const { rows: valid } = await db.query(
      `SELECT es.id FROM employee_skills es
       JOIN squad_members sm ON sm.user_id = es.user_id
       JOIN squads s ON s.id = sm.squad_id
       WHERE es.id = ANY($1) AND s.manager_id = $2 AND es.status = 'pending'`,
      [ids, req.user.id]
    );
    if (!valid.length) return res.status(404).json({ error: 'No valid pending skills found' });

    const validIds = valid.map(r => r.id);
    await db.query(
      `UPDATE employee_skills SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = ANY($2)`,
      [req.user.id, validIds]
    );
    for (const id of validIds) {
      await db.query(
        'INSERT INTO skill_workflow_history (employee_skill_id, changed_by, from_status, to_status) VALUES ($1, $2, $3, $4)',
        [id, req.user.id, 'pending', 'approved']
      );
    }

    const mgr = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
    const mgrName = `${mgr.rows[0].first_name} ${mgr.rows[0].last_name}`;
    const { rows: details } = await db.query(
      `SELECT u.email, u.first_name, sc.name AS skill_name
       FROM employee_skills es
       JOIN users u ON u.id = es.user_id
       JOIN skills_catalogue sc ON sc.id = es.skill_id
       WHERE es.id = ANY($1)`,
      [validIds]
    );
    for (const d of details) {
      email.sendSkillApproved(d.email, d.first_name, d.skill_name, mgrName);
    }

    res.json({ approved: validIds.length, skipped: ids.length - validIds.length });
  } catch (err) { next(err); }
};

// ── BULK CSV UPLOAD ────────────────────────────────────────────────────────

function parseCsv(buffer) {
  const lines = buffer.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // Simple CSV parse: handles quoted fields containing commas
    const fields = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        fields.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    rows.push(fields);
  }
  return rows;
}

// POST /skills/bulk-upload/main-skills
// CSV: job_role_name, main_skill_name, description
exports.bulkUploadMainSkills = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });
    const rows = parseCsv(req.file.buffer);
    if (!rows.length) return res.status(400).json({ error: 'CSV is empty' });

    // Skip header row if present
    const dataRows = rows[0][0].toLowerCase() === 'job_role_name' ? rows.slice(1) : rows;

    let inserted = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const [jobRoleName, mainSkillName, description] = dataRows[i];
      const rowNum = i + (rows[0][0].toLowerCase() === 'job_role_name' ? 2 : 1);

      if (!jobRoleName || !mainSkillName) {
        errors.push(`Row ${rowNum}: job_role_name and main_skill_name are required`);
        continue;
      }

      // Find job role (case-insensitive)
      const { rows: roles } = await db.query(
        'SELECT id FROM job_roles WHERE LOWER(name) = LOWER($1) AND is_active = true',
        [jobRoleName]
      );
      if (!roles.length) {
        errors.push(`Row ${rowNum}: Job role "${jobRoleName}" not found`);
        continue;
      }
      const jobRoleId = roles[0].id;

      // Check for duplicate main skill under this job role
      const { rows: existing } = await db.query(
        'SELECT id FROM main_skills WHERE LOWER(name) = LOWER($1) AND job_role_id = $2',
        [mainSkillName, jobRoleId]
      );
      if (existing.length) {
        skipped++;
        continue;
      }

      await db.query(
        'INSERT INTO main_skills (job_role_id, name, description) VALUES ($1, $2, $3)',
        [jobRoleId, mainSkillName, description || null]
      );
      inserted++;
    }

    res.json({ inserted, skipped, errors });
  } catch (err) { next(err); }
};

// POST /skills/bulk-upload/sub-skills
// CSV: job_role_name, main_skill_name, skill_name, category_name, description
exports.bulkUploadSubSkills = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });
    const rows = parseCsv(req.file.buffer);
    if (!rows.length) return res.status(400).json({ error: 'CSV is empty' });

    const dataRows = rows[0][0].toLowerCase() === 'job_role_name' ? rows.slice(1) : rows;

    let inserted = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const [jobRoleName, mainSkillName, skillName, categoryName, description] = dataRows[i];
      const rowNum = i + (rows[0][0].toLowerCase() === 'job_role_name' ? 2 : 1);

      if (!skillName) {
        errors.push(`Row ${rowNum}: skill_name is required`);
        continue;
      }

      // Resolve optional main skill
      let mainSkillId = null;
      if (mainSkillName) {
        let jobRoleId = null;
        if (jobRoleName) {
          const { rows: roles } = await db.query(
            'SELECT id FROM job_roles WHERE LOWER(name) = LOWER($1)', [jobRoleName]
          );
          if (!roles.length) {
            errors.push(`Row ${rowNum}: Job role "${jobRoleName}" not found`);
            continue;
          }
          jobRoleId = roles[0].id;
        }

        const msQuery = jobRoleId
          ? 'SELECT id FROM main_skills WHERE LOWER(name) = LOWER($1) AND job_role_id = $2'
          : 'SELECT id FROM main_skills WHERE LOWER(name) = LOWER($1) LIMIT 1';
        const msParams = jobRoleId ? [mainSkillName, jobRoleId] : [mainSkillName];
        const { rows: ms } = await db.query(msQuery, msParams);
        if (!ms.length) {
          errors.push(`Row ${rowNum}: Main skill "${mainSkillName}" not found${jobRoleName ? ` under job role "${jobRoleName}"` : ''}`);
          continue;
        }
        mainSkillId = ms[0].id;
      }

      // Resolve optional category — create if not found
      let categoryId = null;
      if (categoryName) {
        const { rows: cats } = await db.query(
          'SELECT id FROM skill_categories WHERE LOWER(name) = LOWER($1)', [categoryName]
        );
        if (cats.length) {
          categoryId = cats[0].id;
        } else {
          const { rows: newCat } = await db.query(
            'INSERT INTO skill_categories (name) VALUES ($1) RETURNING id', [categoryName]
          );
          categoryId = newCat[0].id;
        }
      }

      // Check for duplicate skill name under same main_skill (or globally if no main skill)
      const dupQuery = mainSkillId
        ? 'SELECT id FROM skills_catalogue WHERE LOWER(name) = LOWER($1) AND main_skill_id = $2'
        : 'SELECT id FROM skills_catalogue WHERE LOWER(name) = LOWER($1) AND main_skill_id IS NULL';
      const dupParams = mainSkillId ? [skillName, mainSkillId] : [skillName];
      const { rows: dup } = await db.query(dupQuery, dupParams);
      if (dup.length) { skipped++; continue; }

      await db.query(
        'INSERT INTO skills_catalogue (name, description, main_skill_id, category_id) VALUES ($1, $2, $3, $4)',
        [skillName, description || null, mainSkillId, categoryId]
      );
      inserted++;
    }

    res.json({ inserted, skipped, errors });
  } catch (err) { next(err); }
};

// ── HEATMAP ────────────────────────────────────────────────────────────────

// GET /skills/heatmap — manager sees their squad; admin/resourcing see all
exports.getSkillsHeatmap = async (req, res, next) => {
  try {
    let employeeRows, skillRows, matrixRows;

    if (req.user.role === 'manager') {
      ({ rows: employeeRows } = await db.query(
        `SELECT DISTINCT u.id, u.first_name || ' ' || u.last_name AS name
         FROM users u
         JOIN squad_members sm ON sm.user_id = u.id
         JOIN squads s ON s.id = sm.squad_id
         WHERE s.manager_id = $1 ORDER BY name`,
        [req.user.id]
      ));
      ({ rows: matrixRows } = await db.query(
        `SELECT es.user_id, es.skill_id, es.weighting, es.status
         FROM employee_skills es
         JOIN squad_members sm ON sm.user_id = es.user_id
         JOIN squads s ON s.id = sm.squad_id
         WHERE s.manager_id = $1`,
        [req.user.id]
      ));
    } else {
      ({ rows: employeeRows } = await db.query(
        `SELECT id, first_name || ' ' || last_name AS name FROM users
         WHERE role = 'employee' AND is_active = true ORDER BY name`
      ));
      ({ rows: matrixRows } = await db.query(
        `SELECT user_id, skill_id, weighting, status FROM employee_skills`
      ));
    }

    ({ rows: skillRows } = await db.query(
      `SELECT sc.id, sc.name, cat.name AS category_name
       FROM skills_catalogue sc
       LEFT JOIN skill_categories cat ON cat.id = sc.category_id
       WHERE sc.is_active = true ORDER BY cat.name, sc.name`
    ));

    // Build lookup: { userId_skillId: { weighting, status } }
    const matrix = {};
    for (const r of matrixRows) {
      matrix[`${r.user_id}_${r.skill_id}`] = { weighting: r.weighting, status: r.status };
    }

    res.json({ employees: employeeRows, skills: skillRows, matrix });
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
