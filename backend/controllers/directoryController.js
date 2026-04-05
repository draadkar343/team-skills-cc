const db = require('../config/db');

exports.getDirectory = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT
        u.id,
        u.first_name  AS "firstName",
        u.last_name   AS "lastName",
        u.email,
        u.role,
        u.avatar_url  AS "avatarUrl",
        jr.name       AS "jobRole",
        sq.name       AS squad,
        mgr.first_name || ' ' || mgr.last_name AS manager,
        COUNT(DISTINCT es.id) FILTER (WHERE es.status = 'approved') AS "approvedSkills",
        COUNT(DISTINCT ec.id) FILTER (WHERE ec.status = 'approved') AS "certifications"
      FROM users u
      LEFT JOIN job_roles jr ON jr.id = u.job_role_id
      LEFT JOIN squad_members sm ON sm.user_id = u.id
      LEFT JOIN squads sq ON sq.id = sm.squad_id
      LEFT JOIN users mgr ON mgr.id = sq.manager_id
      LEFT JOIN employee_skills es ON es.user_id = u.id
      LEFT JOIN employee_certifications ec ON ec.user_id = u.id
      WHERE u.is_active = true
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, u.avatar_url,
               jr.name, sq.name, mgr.first_name, mgr.last_name
      ORDER BY u.last_name, u.first_name
    `);
    res.json(rows);
  } catch (err) { next(err); }
};
