const db = require('../config/db');

// ── 1. Skills ──────────────────────────────────────────────────────────────
exports.skillsReport = async (req, res, next) => {
  try {
    const [summary, statusBreakdown, topSkills, bySquad, byCategory] = await Promise.all([
      db.query(`
        SELECT
          COUNT(DISTINCT skill_id)  FILTER (WHERE status = 'approved') AS unique_skills_approved,
          COUNT(DISTINCT user_id)                                        AS employees_with_skills,
          COUNT(*)                  FILTER (WHERE status = 'pending')   AS pending_approvals,
          ROUND(AVG(weighting)      FILTER (WHERE status = 'approved')) AS avg_weighting
        FROM employee_skills
      `),
      db.query(`
        SELECT status, COUNT(*) AS count
        FROM employee_skills
        GROUP BY status
        ORDER BY status
      `),
      db.query(`
        SELECT sc.name AS skill_name,
               COALESCE(cat.name, 'Uncategorised') AS category,
               COUNT(es.id)            AS employee_count,
               ROUND(AVG(es.weighting)) AS avg_weighting
        FROM employee_skills es
        JOIN skills_catalogue sc ON es.skill_id = sc.id
        LEFT JOIN skill_categories cat ON sc.category_id = cat.id
        WHERE es.status = 'approved'
        GROUP BY sc.id, sc.name, cat.name
        ORDER BY employee_count DESC
        LIMIT 20
      `),
      db.query(`
        SELECT sq.name AS squad_name,
               COUNT(DISTINCT sm.user_id)                                          AS members,
               COUNT(DISTINCT es.skill_id) FILTER (WHERE es.status = 'approved')  AS unique_skills,
               COUNT(es.id)                FILTER (WHERE es.status = 'approved')  AS total_approved
        FROM squads sq
        JOIN squad_members sm ON sq.id = sm.squad_id
        LEFT JOIN employee_skills es ON sm.user_id = es.user_id
        GROUP BY sq.id, sq.name
        ORDER BY sq.name
      `),
      db.query(`
        SELECT COALESCE(cat.name, 'Uncategorised') AS category,
               COUNT(es.id) AS count
        FROM employee_skills es
        JOIN skills_catalogue sc ON es.skill_id = sc.id
        LEFT JOIN skill_categories cat ON sc.category_id = cat.id
        WHERE es.status = 'approved'
        GROUP BY cat.name
        ORDER BY count DESC
      `),
    ]);
    res.json({
      summary: summary.rows[0],
      statusBreakdown: statusBreakdown.rows,
      topSkills: topSkills.rows,
      bySquad: bySquad.rows,
      byCategory: byCategory.rows,
    });
  } catch (err) { next(err); }
};

// ── 2. Timesheets ──────────────────────────────────────────────────────────
exports.timesheetReport = async (req, res, next) => {
  try {
    const fromDate = req.query.from || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const toDate   = req.query.to   || new Date().toISOString().slice(0, 10);

    const [summary, byEmployee, byStatus, byWeek] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)                         AS total_timesheets,
          COUNT(DISTINCT user_id)          AS unique_employees,
          COALESCE(SUM(total_hours), 0)    AS total_hours,
          ROUND(AVG(total_hours), 1)       AS avg_hours_per_sheet,
          COUNT(*) FILTER (WHERE status = 'approved') AS approved_count
        FROM timesheets
        WHERE week_start_date BETWEEN $1 AND $2
      `, [fromDate, toDate]),
      db.query(`
        SELECT u.first_name || ' ' || u.last_name AS employee,
               COALESCE(sq.name, '—') AS squad,
               COUNT(t.id)                    AS timesheet_count,
               COALESCE(SUM(t.total_hours), 0) AS total_hours,
               ROUND(AVG(t.total_hours), 1)   AS avg_hours,
               COUNT(t.id) FILTER (WHERE t.status = 'approved') AS approved_count
        FROM timesheets t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN squad_members sm ON u.id = sm.user_id
        LEFT JOIN squads sq ON sm.squad_id = sq.id
        WHERE t.week_start_date BETWEEN $1 AND $2
        GROUP BY u.id, u.first_name, u.last_name, sq.name
        ORDER BY total_hours DESC
      `, [fromDate, toDate]),
      db.query(`
        SELECT status, COUNT(*) AS count,
               COALESCE(SUM(total_hours), 0) AS total_hours
        FROM timesheets
        WHERE week_start_date BETWEEN $1 AND $2
        GROUP BY status
      `, [fromDate, toDate]),
      db.query(`
        SELECT TO_CHAR(week_start_date, 'YYYY-MM-DD') AS week,
               COUNT(*)                               AS submissions,
               COALESCE(SUM(total_hours), 0)          AS total_hours
        FROM timesheets
        WHERE week_start_date BETWEEN $1 AND $2
        GROUP BY week_start_date
        ORDER BY week_start_date DESC
        LIMIT 12
      `, [fromDate, toDate]),
    ]);
    res.json({
      dateRange: { from: fromDate, to: toDate },
      summary: summary.rows[0],
      byEmployee: byEmployee.rows,
      byStatus: byStatus.rows,
      byWeek: byWeek.rows,
    });
  } catch (err) { next(err); }
};

// ── 3. Certifications ─────────────────────────────────────────────────────
exports.certReport = async (req, res, next) => {
  try {
    const [summary, byStatus, expiringSoon, byProvider] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)                                                               AS total,
          COUNT(*) FILTER (WHERE status = 'approved')                           AS approved,
          COUNT(*) FILTER (WHERE status = 'pending')                            AS pending,
          COUNT(*) FILTER (WHERE expiration_date < NOW())                       AS expired,
          COUNT(*) FILTER (WHERE expiration_date BETWEEN NOW() AND NOW() + INTERVAL '90 days') AS expiring_soon
        FROM employee_certifications
      `),
      db.query(`SELECT status, COUNT(*) AS count FROM employee_certifications GROUP BY status`),
      db.query(`
        SELECT u.first_name || ' ' || u.last_name AS employee,
               ec.name AS cert_name,
               COALESCE(ec.provider, '—') AS provider,
               ec.expiration_date,
               (ec.expiration_date - CURRENT_DATE) AS days_remaining
        FROM employee_certifications ec
        JOIN users u ON ec.user_id = u.id
        WHERE ec.expiration_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
          AND ec.status = 'approved'
        ORDER BY ec.expiration_date ASC
      `),
      db.query(`
        SELECT COALESCE(provider, 'Unknown') AS provider, COUNT(*) AS count
        FROM employee_certifications
        WHERE status = 'approved'
        GROUP BY provider
        ORDER BY count DESC
        LIMIT 10
      `),
    ]);
    res.json({
      summary: summary.rows[0],
      byStatus: byStatus.rows,
      expiringSoon: expiringSoon.rows,
      byProvider: byProvider.rows,
    });
  } catch (err) { next(err); }
};

// ── 4. Leave ───────────────────────────────────────────────────────────────
exports.leaveReport = async (req, res, next) => {
  try {
    const fromDate = req.query.from || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    const toDate   = req.query.to   || new Date().toISOString().slice(0, 10);

    const [summary, byType, byEmployee, byMonth] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)                                                     AS total_requests,
          COUNT(*) FILTER (WHERE status = 'approved')                 AS approved,
          COUNT(*) FILTER (WHERE status = 'pending')                  AS pending,
          COUNT(*) FILTER (WHERE status = 'rejected')                 AS rejected,
          COALESCE(SUM(total_days) FILTER (WHERE status = 'approved'), 0) AS total_days_approved
        FROM leave_requests
        WHERE start_date BETWEEN $1 AND $2
      `, [fromDate, toDate]),
      db.query(`
        SELECT lt.name AS leave_type, lt.colour,
               COUNT(lr.id)                                                          AS request_count,
               COALESCE(SUM(lr.total_days) FILTER (WHERE lr.status = 'approved'), 0) AS total_days
        FROM leave_types lt
        LEFT JOIN leave_requests lr ON lt.id = lr.leave_type_id
          AND lr.start_date BETWEEN $1 AND $2
        GROUP BY lt.id, lt.name, lt.colour
        ORDER BY total_days DESC
      `, [fromDate, toDate]),
      db.query(`
        SELECT u.first_name || ' ' || u.last_name AS employee,
               COALESCE(sq.name, '—') AS squad,
               COUNT(lr.id)                                                          AS request_count,
               COALESCE(SUM(lr.total_days) FILTER (WHERE lr.status = 'approved'), 0) AS days_taken
        FROM users u
        LEFT JOIN leave_requests lr ON u.id = lr.user_id AND lr.start_date BETWEEN $1 AND $2
        LEFT JOIN squad_members sm ON u.id = sm.user_id
        LEFT JOIN squads sq ON sm.squad_id = sq.id
        WHERE u.is_active = true AND u.role != 'administrator'
        GROUP BY u.id, u.first_name, u.last_name, sq.name
        ORDER BY days_taken DESC
        LIMIT 25
      `, [fromDate, toDate]),
      db.query(`
        SELECT TO_CHAR(start_date, 'YYYY-MM') AS month,
               COUNT(*)                       AS request_count,
               COALESCE(SUM(total_days) FILTER (WHERE status = 'approved'), 0) AS approved_days
        FROM leave_requests
        WHERE start_date BETWEEN $1 AND $2
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `, [fromDate, toDate]),
    ]);
    res.json({
      dateRange: { from: fromDate, to: toDate },
      summary: summary.rows[0],
      byType: byType.rows,
      byEmployee: byEmployee.rows,
      byMonth: byMonth.rows,
    });
  } catch (err) { next(err); }
};

// ── 5. Resource Allocation ─────────────────────────────────────────────────
exports.allocationReport = async (req, res, next) => {
  try {
    const [summary, byClient, byGrade, unallocated] = await Promise.all([
      db.query(`
        SELECT
          COUNT(DISTINCT client_id)  AS active_clients,
          COUNT(DISTINCT user_id)    AS allocated_employees,
          ROUND(AVG(percentage))     AS avg_allocation_pct
        FROM client_allocations
      `),
      db.query(`
        SELECT c.name AS client_name,
               COUNT(ca.user_id) AS headcount,
               ROUND(AVG(ca.percentage)) AS avg_pct,
               COUNT(*) FILTER (WHERE ca.grade = 'A') AS grade_a,
               COUNT(*) FILTER (WHERE ca.grade = 'B') AS grade_b,
               COUNT(*) FILTER (WHERE ca.grade = 'C') AS grade_c
        FROM clients c
        LEFT JOIN client_allocations ca ON c.id = ca.client_id
        WHERE c.is_active = true
        GROUP BY c.id, c.name
        ORDER BY headcount DESC
      `),
      db.query(`
        SELECT COALESCE(grade, 'Ungraded') AS grade,
               COUNT(*) AS count,
               ROUND(AVG(percentage)) AS avg_pct
        FROM client_allocations
        GROUP BY grade
        ORDER BY grade NULLS LAST
      `),
      db.query(`
        SELECT u.first_name || ' ' || u.last_name AS employee,
               COALESCE(jr.name, '—') AS job_role,
               COALESCE(sq.name, '—') AS squad
        FROM users u
        LEFT JOIN job_roles jr ON u.job_role_id = jr.id
        LEFT JOIN squad_members sm ON u.id = sm.user_id
        LEFT JOIN squads sq ON sm.squad_id = sq.id
        WHERE u.is_active = true AND u.role = 'employee'
          AND NOT EXISTS (SELECT 1 FROM client_allocations ca WHERE ca.user_id = u.id)
        ORDER BY u.last_name, u.first_name
      `),
    ]);
    res.json({
      summary: summary.rows[0],
      byClient: byClient.rows,
      byGrade: byGrade.rows,
      unallocated: unallocated.rows,
    });
  } catch (err) { next(err); }
};

// ── 6. Talent Pipeline ────────────────────────────────────────────────────
exports.talentReport = async (req, res, next) => {
  try {
    const [summary, byStage, byJobRole, recent] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)                                           AS total_candidates,
          COUNT(*) FILTER (WHERE stage = 'offer_made')      AS offers,
          COUNT(*) FILTER (WHERE stage = 'hired')           AS hired,
          ROUND(AVG(interview_score) FILTER (WHERE interview_score IS NOT NULL), 1) AS avg_score
        FROM talent_candidates
      `),
      db.query(`
        SELECT stage, COUNT(*) AS count
        FROM talent_candidates
        GROUP BY stage
        ORDER BY
          CASE stage
            WHEN 'sourced'    THEN 1
            WHEN 'screening'  THEN 2
            WHEN 'interview'  THEN 3
            WHEN 'assessment' THEN 4
            WHEN 'offer_made' THEN 5
            WHEN 'hired'      THEN 6
            WHEN 'rejected'   THEN 7
            ELSE 8
          END
      `),
      db.query(`
        SELECT COALESCE(jr.name, tc.job_role_text, 'Unknown') AS job_role,
               COUNT(*) AS candidate_count
        FROM talent_candidates tc
        LEFT JOIN job_roles jr ON tc.job_role_id = jr.id
        GROUP BY jr.name, tc.job_role_text
        ORDER BY candidate_count DESC
        LIMIT 10
      `),
      db.query(`
        SELECT tc.first_name || ' ' || tc.last_name AS candidate,
               COALESCE(jr.name, tc.job_role_text, '—') AS job_role,
               tc.stage, tc.interview_score,
               TO_CHAR(tc.created_at, 'YYYY-MM-DD') AS added_on
        FROM talent_candidates tc
        LEFT JOIN job_roles jr ON tc.job_role_id = jr.id
        ORDER BY tc.created_at DESC
        LIMIT 15
      `),
    ]);
    res.json({
      summary: summary.rows[0],
      byStage: byStage.rows,
      byJobRole: byJobRole.rows,
      recent: recent.rows,
    });
  } catch (err) { next(err); }
};

// ── 7. Recognition (Kudos) ────────────────────────────────────────────────
exports.kudosReport = async (req, res, next) => {
  try {
    const fromDate = req.query.from || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    const toDate   = req.query.to   || new Date().toISOString().slice(0, 10);

    const [summary, topRecipients, topGivers, byCategory] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)                    AS total,
          COUNT(DISTINCT to_user_id)  AS unique_recipients,
          COUNT(DISTINCT from_user_id) AS unique_givers,
          COUNT(DISTINCT category)    AS categories_used
        FROM kudos
        WHERE created_at::date BETWEEN $1 AND $2
      `, [fromDate, toDate]),
      db.query(`
        SELECT u.first_name || ' ' || u.last_name AS employee,
               COALESCE(sq.name, '—') AS squad,
               COUNT(k.id) AS kudos_received
        FROM kudos k
        JOIN users u ON k.to_user_id = u.id
        LEFT JOIN squad_members sm ON u.id = sm.user_id
        LEFT JOIN squads sq ON sm.squad_id = sq.id
        WHERE k.created_at::date BETWEEN $1 AND $2
        GROUP BY u.id, u.first_name, u.last_name, sq.name
        ORDER BY kudos_received DESC
        LIMIT 10
      `, [fromDate, toDate]),
      db.query(`
        SELECT u.first_name || ' ' || u.last_name AS employee,
               COUNT(k.id) AS kudos_given
        FROM kudos k
        JOIN users u ON k.from_user_id = u.id
        WHERE k.created_at::date BETWEEN $1 AND $2
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY kudos_given DESC
        LIMIT 10
      `, [fromDate, toDate]),
      db.query(`
        SELECT COALESCE(category, 'Uncategorised') AS category,
               COUNT(*) AS count
        FROM kudos
        WHERE created_at::date BETWEEN $1 AND $2
        GROUP BY category
        ORDER BY count DESC
      `, [fromDate, toDate]),
    ]);
    res.json({
      dateRange: { from: fromDate, to: toDate },
      summary: summary.rows[0],
      topRecipients: topRecipients.rows,
      topGivers: topGivers.rows,
      byCategory: byCategory.rows,
    });
  } catch (err) { next(err); }
};
