const db = require('../config/db');

exports.getChart = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
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
    `);

    const { rows: unassigned } = await db.query(`
      SELECT u.id, u.first_name AS "firstName", u.last_name AS "lastName",
             u.avatar_url AS "avatarUrl", u.email, jr.name AS "jobRole"
      FROM users u
      LEFT JOIN job_roles jr ON jr.id = u.job_role_id
      WHERE u.is_active = true
        AND u.role = 'employee'
        AND NOT EXISTS (SELECT 1 FROM squad_members sm WHERE sm.user_id = u.id)
      ORDER BY u.last_name, u.first_name
    `);

    res.json({ squads: rows, unassigned });
  } catch (err) { next(err); }
};
