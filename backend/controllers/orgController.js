const db = require('../config/db');

exports.getChart = async (req, res, next) => {
  try {
    const [squadsRes, unassignedRes, smeRes] = await Promise.all([
      db.query(`
        SELECT
          sq.id   AS squad_id,
          sq.name AS squad_name,
          m.id          AS manager_id,
          m.first_name  AS manager_first,
          m.last_name   AS manager_last,
          m.avatar_url  AS manager_avatar,
          m.email       AS manager_email,
          jrm.name      AS manager_job_role,
          json_agg(
            json_build_object(
              'id',        u.id,
              'firstName', u.first_name,
              'lastName',  u.last_name,
              'avatarUrl', u.avatar_url,
              'email',     u.email,
              'jobRole',   jr.name
            ) ORDER BY u.last_name, u.first_name
          ) FILTER (WHERE u.id IS NOT NULL) AS members
        FROM squads sq
        JOIN users m ON m.id = sq.manager_id AND m.is_active = true
        LEFT JOIN job_roles jrm ON jrm.id = m.job_role_id
        LEFT JOIN squad_members sm ON sm.squad_id = sq.id
        LEFT JOIN users u ON u.id = sm.user_id AND u.id != sq.manager_id AND u.is_active = true
        LEFT JOIN job_roles jr ON jr.id = u.job_role_id
        GROUP BY sq.id, sq.name, m.id, m.first_name, m.last_name, m.avatar_url, m.email, jrm.name
        ORDER BY sq.name
      `),
      db.query(`
        SELECT u.id, u.first_name AS "firstName", u.last_name AS "lastName",
               u.avatar_url AS "avatarUrl", u.email, jr.name AS "jobRole"
        FROM users u
        LEFT JOIN job_roles jr ON jr.id = u.job_role_id
        WHERE u.is_active = true
          AND u.role = 'employee'
          AND NOT EXISTS (SELECT 1 FROM squad_members sm WHERE sm.user_id = u.id)
        ORDER BY u.last_name, u.first_name
      `),
      // All active job roles with their SMEs
      db.query(`
        SELECT jr.id AS job_role_id, jr.name AS job_role_name,
               json_agg(
                 json_build_object(
                   'smeId',     s.id,
                   'userId',    u.id,
                   'firstName', u.first_name,
                   'lastName',  u.last_name,
                   'avatarUrl', u.avatar_url,
                   'email',     u.email,
                   'role',      u.role
                 ) ORDER BY u.last_name, u.first_name
               ) FILTER (WHERE s.id IS NOT NULL) AS smes
        FROM job_roles jr
        LEFT JOIN job_role_smes s ON s.job_role_id = jr.id
        LEFT JOIN users u ON u.id = s.user_id AND u.is_active = true
        WHERE jr.is_active = true
        GROUP BY jr.id, jr.name
        ORDER BY jr.name
      `),
    ]);

    res.json({ squads: squadsRes.rows, unassigned: unassignedRes.rows, jobRoles: smeRes.rows });
  } catch (err) { next(err); }
};

// POST /org/smes  { jobRoleId, userId }
exports.addSme = async (req, res, next) => {
  try {
    const { jobRoleId, userId } = req.body;
    if (!jobRoleId || !userId) return res.status(400).json({ error: 'jobRoleId and userId required' });
    const { rows } = await db.query(
      `INSERT INTO job_role_smes (job_role_id, user_id, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (job_role_id, user_id) DO NOTHING
       RETURNING *`,
      [jobRoleId, userId, req.user.id]
    );
    res.status(201).json(rows[0] || { job_role_id: jobRoleId, user_id: userId });
  } catch (err) { next(err); }
};

// DELETE /org/smes/:id
exports.removeSme = async (req, res, next) => {
  try {
    await db.query('DELETE FROM job_role_smes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
