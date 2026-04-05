const db = require('../config/db');

// ── Employee ────────────────────────────────────────────────────────────────

// GET /onboarding/me  — returns the employee's assigned checklist + progress
exports.getMyOnboarding = async (req, res, next) => {
  try {
    const { rows: assignments } = await db.query(`
      SELECT eo.id, eo.assigned_at,
             ot.id AS template_id, ot.name AS template_name, ot.description
      FROM employee_onboarding eo
      JOIN onboarding_templates ot ON ot.id = eo.template_id
      WHERE eo.user_id = $1
      ORDER BY eo.assigned_at DESC
      LIMIT 1
    `, [req.user.id]);

    if (!assignments.length) return res.json(null);

    const a = assignments[0];

    const { rows: tasks } = await db.query(`
      SELECT ott.id, ott.title, ott.description, ott.sort_order,
             p.completed_at
      FROM onboarding_template_tasks ott
      LEFT JOIN employee_onboarding_progress p
        ON p.onboarding_id = $1 AND p.task_id = ott.id
      WHERE ott.template_id = $2
      ORDER BY ott.sort_order, ott.id
    `, [a.id, a.template_id]);

    const done  = tasks.filter(t => t.completed_at).length;
    const total = tasks.length;

    res.json({ ...a, tasks, done, total, pct: total ? Math.round((done / total) * 100) : 0 });
  } catch (err) { next(err); }
};

// PATCH /onboarding/me/tasks/:taskId/toggle
exports.toggleTask = async (req, res, next) => {
  try {
    // verify the task belongs to an onboarding assigned to this user
    const { rows: check } = await db.query(`
      SELECT eo.id AS onboarding_id, p.completed_at
      FROM employee_onboarding eo
      JOIN onboarding_template_tasks ott ON ott.id = $1 AND ott.template_id = eo.template_id
      LEFT JOIN employee_onboarding_progress p
        ON p.onboarding_id = eo.id AND p.task_id = $1
      WHERE eo.user_id = $2
      ORDER BY eo.assigned_at DESC LIMIT 1
    `, [req.params.taskId, req.user.id]);

    if (!check.length) return res.status(404).json({ error: 'Task not found' });

    const { onboarding_id, completed_at } = check[0];

    if (completed_at) {
      await db.query(
        'DELETE FROM employee_onboarding_progress WHERE onboarding_id = $1 AND task_id = $2',
        [onboarding_id, req.params.taskId]
      );
    } else {
      await db.query(
        `INSERT INTO employee_onboarding_progress (onboarding_id, task_id, completed_at)
         VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
        [onboarding_id, req.params.taskId]
      );
    }
    res.json({ completed: !completed_at });
  } catch (err) { next(err); }
};

// ── Admin — templates ────────────────────────────────────────────────────────

exports.listTemplates = async (req, res, next) => {
  try {
    const { rows: templates } = await db.query(
      'SELECT * FROM onboarding_templates ORDER BY name'
    );
    const { rows: tasks } = await db.query(
      'SELECT * FROM onboarding_template_tasks ORDER BY template_id, sort_order, id'
    );
    const taskMap = {};
    for (const t of tasks) {
      (taskMap[t.template_id] = taskMap[t.template_id] || []).push(t);
    }
    res.json(templates.map(t => ({ ...t, tasks: taskMap[t.id] || [] })));
  } catch (err) { next(err); }
};

exports.createTemplate = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(
      `INSERT INTO onboarding_templates (name, description, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), description || null, req.user.id]
    );
    res.status(201).json({ ...rows[0], tasks: [] });
  } catch (err) { next(err); }
};

exports.updateTemplate = async (req, res, next) => {
  try {
    const { name, description, is_active } = req.body;
    const { rows } = await db.query(
      `UPDATE onboarding_templates
       SET name       = COALESCE($1, name),
           description = COALESCE($2, description),
           is_active  = COALESCE($3, is_active),
           updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [name?.trim() || null, description ?? null, is_active ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteTemplate = async (req, res, next) => {
  try {
    await db.query('DELETE FROM onboarding_templates WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── Admin — template tasks ────────────────────────────────────────────────────

exports.addTask = async (req, res, next) => {
  try {
    const { title, description, sort_order } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
    const { rows } = await db.query(
      `INSERT INTO onboarding_template_tasks (template_id, title, description, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, title.trim(), description || null, sort_order ?? 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.updateTask = async (req, res, next) => {
  try {
    const { title, description, sort_order } = req.body;
    const { rows } = await db.query(
      `UPDATE onboarding_template_tasks
       SET title       = COALESCE($1, title),
           description = COALESCE($2, description),
           sort_order  = COALESCE($3, sort_order)
       WHERE id = $4 RETURNING *`,
      [title?.trim() || null, description ?? null, sort_order ?? null, req.params.taskId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteTask = async (req, res, next) => {
  try {
    await db.query('DELETE FROM onboarding_template_tasks WHERE id = $1', [req.params.taskId]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── Admin — assignments ────────────────────────────────────────────────────────

exports.listAssignments = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT eo.id, eo.assigned_at,
             u.first_name || ' ' || u.last_name AS employee_name,
             u.email, u.avatar_url,
             ot.name AS template_name,
             COUNT(ott.id) AS total_tasks,
             COUNT(p.task_id) AS completed_tasks
      FROM employee_onboarding eo
      JOIN users u ON eo.user_id = u.id
      JOIN onboarding_templates ot ON eo.template_id = ot.id
      LEFT JOIN onboarding_template_tasks ott ON ott.template_id = eo.template_id
      LEFT JOIN employee_onboarding_progress p ON p.onboarding_id = eo.id AND p.task_id = ott.id
      GROUP BY eo.id, eo.assigned_at, u.first_name, u.last_name, u.email, u.avatar_url, ot.name
      ORDER BY eo.assigned_at DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
};

exports.assign = async (req, res, next) => {
  try {
    const { userId, templateId } = req.body;
    if (!userId || !templateId) return res.status(400).json({ error: 'userId and templateId required' });
    const { rows } = await db.query(
      `INSERT INTO employee_onboarding (user_id, template_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, template_id) DO UPDATE SET assigned_at = NOW(), assigned_by = $3
       RETURNING *`,
      [userId, templateId, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.removeAssignment = async (req, res, next) => {
  try {
    await db.query('DELETE FROM employee_onboarding WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
