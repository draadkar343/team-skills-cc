const db = require('../config/db');

const ALLOWED_TABLES = [
  'users', 'squads', 'squad_members',
  'job_roles', 'main_skills',
  'skill_categories', 'skills_catalogue',
  'employee_skills', 'skill_workflow_history',
  'timesheets', 'timesheet_entries',
  'system_config',
];

exports.getAuditLog = async (req, res, next) => {
  try {
    const { table, operation, rowId, from, to, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];
    let p = 1;

    if (table && ALLOWED_TABLES.includes(table)) {
      conditions.push(`table_name = $${p++}`);
      params.push(table);
    }
    if (operation && ['INSERT', 'UPDATE', 'DELETE'].includes(operation.toUpperCase())) {
      conditions.push(`operation = $${p++}`);
      params.push(operation.toUpperCase());
    }
    if (rowId) {
      conditions.push(`row_id = $${p++}`);
      params.push(parseInt(rowId));
    }
    if (from) {
      conditions.push(`changed_at >= $${p++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`changed_at <= $${p++}`);
      params.push(to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [{ rows: countRows }, { rows }] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM audit_log ${where}`, params),
      db.query(
        `SELECT id, table_name, operation, row_id, old_data, new_data, changed_at
         FROM audit_log ${where}
         ORDER BY changed_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, parseInt(limit), offset]
      ),
    ]);

    res.json({
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      entries: rows,
    });
  } catch (err) { next(err); }
};

exports.getTables = (_req, res) => res.json(ALLOWED_TABLES);
