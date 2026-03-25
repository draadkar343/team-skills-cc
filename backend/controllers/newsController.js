const db = require('../config/db');

// GET /news/feed — returns news for the authenticated user's job role + global (NULL) news
exports.getNewsFeed = async (req, res, next) => {
  try {
    // Look up the user's current job_role_id
    const { rows: userRows } = await db.query('SELECT job_role_id FROM users WHERE id = $1', [req.user.id]);
    const jobRoleId = userRows[0]?.job_role_id || null;

    const { rows } = await db.query(
      `SELECT n.id, n.title, n.body, n.created_at, n.job_role_id,
              jr.name AS job_role_name,
              u.first_name || ' ' || u.last_name AS author
       FROM news_items n
       JOIN users u ON u.id = n.created_by
       LEFT JOIN job_roles jr ON jr.id = n.job_role_id
       WHERE n.is_active = true
         AND (n.job_role_id IS NULL OR n.job_role_id = $1)
       ORDER BY n.created_at DESC
       LIMIT 20`,
      [jobRoleId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// GET /news — admin: all news items
exports.getAllNews = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT n.id, n.title, n.body, n.is_active, n.created_at, n.updated_at,
              n.job_role_id, jr.name AS job_role_name,
              u.first_name || ' ' || u.last_name AS author
       FROM news_items n
       JOIN users u ON u.id = n.created_by
       LEFT JOIN job_roles jr ON jr.id = n.job_role_id
       ORDER BY n.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// POST /news — admin: create news item
exports.createNews = async (req, res, next) => {
  try {
    const { title, body, jobRoleId } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });
    const { rows } = await db.query(
      `INSERT INTO news_items (title, body, job_role_id, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, body, jobRoleId || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

// PATCH /news/:id — admin: update news item
exports.updateNews = async (req, res, next) => {
  try {
    const { title, body, jobRoleId, isActive } = req.body;
    const { rows } = await db.query(
      `UPDATE news_items SET
        title       = COALESCE($1, title),
        body        = COALESCE($2, body),
        job_role_id = CASE WHEN $3::boolean THEN $4::integer ELSE job_role_id END,
        is_active   = COALESCE($5, is_active),
        updated_at  = NOW()
       WHERE id = $6 RETURNING *`,
      [title || null, body || null, jobRoleId !== undefined, jobRoleId ?? null, isActive ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'News item not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// DELETE /news/:id — admin: hard delete
exports.deleteNews = async (req, res, next) => {
  try {
    const { rows } = await db.query('DELETE FROM news_items WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'News item not found' });
    res.json({ deleted: rows[0].id });
  } catch (err) { next(err); }
};
