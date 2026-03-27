const db = require('../config/db');

// GET /resourcing/stats — dashboard summary
exports.getStats = async (req, res, next) => {
  try {
    const [
      { rows: headcount },
      { rows: allocation },
      { rows: pipeline },
      { rows: squads },
      { rows: recentCandidates },
    ] = await Promise.all([
      // Active employee headcount
      db.query(`SELECT COUNT(*) AS total FROM users WHERE role = 'employee' AND is_active = true`),

      // Allocation buckets
      db.query(`
        SELECT
          SUM(CASE WHEN total_alloc = 0   THEN 1 ELSE 0 END) AS unallocated,
          SUM(CASE WHEN total_alloc > 0 AND total_alloc < 100 THEN 1 ELSE 0 END) AS partial,
          SUM(CASE WHEN total_alloc = 100 THEN 1 ELSE 0 END) AS fully,
          SUM(CASE WHEN total_alloc > 100 THEN 1 ELSE 0 END) AS over
        FROM (
          SELECT u.id,
            COALESCE((
              SELECT SUM(ca.percentage) FROM client_allocations ca
              JOIN clients c ON c.id = ca.client_id
              WHERE ca.user_id = u.id AND c.is_active = true
            ), 0) AS total_alloc
          FROM users u WHERE u.role = 'employee' AND u.is_active = true
        ) sub
      `),

      // Talent pipeline counts by stage
      db.query(`
        SELECT stage, COUNT(*) AS count
        FROM talent_candidates
        GROUP BY stage
        ORDER BY stage
      `),

      // Squad count
      db.query(`SELECT COUNT(*) AS total FROM squads`),

      // 5 most recent talent candidates
      db.query(`
        SELECT tc.first_name || ' ' || tc.last_name AS name,
               tc.stage, tc.job_role_text, tc.created_at,
               jr.name AS job_role_name
        FROM talent_candidates tc
        LEFT JOIN job_roles jr ON jr.id = tc.job_role_id
        ORDER BY tc.created_at DESC
        LIMIT 5
      `),
    ]);

    const alloc = allocation[0];
    res.json({
      headcount: parseInt(headcount[0].total, 10),
      squads: parseInt(squads[0].total, 10),
      allocation: {
        unallocated: parseInt(alloc.unallocated, 10) || 0,
        partial:     parseInt(alloc.partial,     10) || 0,
        fully:       parseInt(alloc.fully,       10) || 0,
        over:        parseInt(alloc.over,         10) || 0,
      },
      pipeline: pipeline.map(r => ({ stage: r.stage, count: parseInt(r.count, 10) })),
      recentCandidates,
    });
  } catch (err) { next(err); }
};

// GET /resourcing/overview
// Returns all employees across all squads with job role, skills, and allocations
exports.getOverview = async (req, res, next) => {
  try {
    // Base employee data
    const { rows: employees } = await db.query(
      `SELECT u.id, u.first_name || ' ' || u.last_name AS name, u.email,
              jr.name AS job_role_name,
              s.name AS squad_name,
              COALESCE((
                SELECT SUM(ca.percentage)
                FROM client_allocations ca
                JOIN clients c ON c.id = ca.client_id
                WHERE ca.user_id = u.id AND c.is_active = true
              ), 0) AS total_allocation
       FROM users u
       LEFT JOIN job_roles jr ON jr.id = u.job_role_id
       LEFT JOIN squad_members sm ON sm.user_id = u.id
       LEFT JOIN squads s ON s.id = sm.squad_id
       WHERE u.role = 'employee' AND u.is_active = true
       ORDER BY s.name NULLS LAST, u.last_name, u.first_name`
    );

    // Skills per employee (approved only)
    const { rows: skillRows } = await db.query(
      `SELECT es.user_id, ms.name AS main_skill_name, sc.name AS sub_skill_name, es.weighting
       FROM employee_skills es
       JOIN skills_catalogue sc ON sc.id = es.skill_id
       LEFT JOIN main_skills ms ON ms.id = sc.main_skill_id
       WHERE es.status = 'approved'
       ORDER BY ms.name, sc.name`
    );

    // Allocations per employee
    const { rows: allocRows } = await db.query(
      `SELECT ca.user_id, c.name AS client_name, ca.percentage, ca.grade, ca.start_date, ca.end_date
       FROM client_allocations ca
       JOIN clients c ON c.id = ca.client_id
       WHERE c.is_active = true
       ORDER BY ca.percentage DESC`
    );

    // Build lookup maps
    const skillsByUser = {};
    for (const r of skillRows) {
      if (!skillsByUser[r.user_id]) skillsByUser[r.user_id] = {};
      const ms = r.main_skill_name || 'Uncategorised';
      if (!skillsByUser[r.user_id][ms]) skillsByUser[r.user_id][ms] = [];
      skillsByUser[r.user_id][ms].push({ name: r.sub_skill_name, weighting: r.weighting });
    }

    const allocsByUser = {};
    for (const r of allocRows) {
      if (!allocsByUser[r.user_id]) allocsByUser[r.user_id] = [];
      allocsByUser[r.user_id].push({
        clientName: r.client_name,
        percentage: r.percentage,
        grade: r.grade || null,
        startDate: r.start_date,
        endDate: r.end_date,
      });
    }

    const result = employees.map(e => ({
      id: e.id,
      name: e.name,
      email: e.email,
      jobRoleName: e.job_role_name || null,
      squadName: e.squad_name || null,
      totalAllocation: parseInt(e.total_allocation, 10),
      mainSkills: Object.entries(skillsByUser[e.id] || {}).map(([name, subSkills]) => ({ name, subSkills })),
      allocations: allocsByUser[e.id] || [],
    }));

    res.json(result);
  } catch (err) { next(err); }
};
