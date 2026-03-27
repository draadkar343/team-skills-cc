const db = require('../config/db');

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
      `SELECT ca.user_id, c.name AS client_name, ca.percentage, ca.start_date, ca.end_date
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
