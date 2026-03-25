const db = require('../config/db');

const ALLOWED_TABLES = [
  'users', 'squads', 'squad_members',
  'job_roles', 'main_skills',
  'skill_categories', 'skills_catalogue',
  'employee_skills', 'skill_workflow_history',
  'timesheets', 'timesheet_entries',
  'system_config',
];

// error_log is tracked separately but included in retention
const RETENTION_TABLES = [...ALLOWED_TABLES, 'error_log'];

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

exports.getErrorLog = async (req, res, next) => {
  try {
    const { level, path: urlPath, statusCode, from, to, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];
    let p = 1;

    if (level) { conditions.push(`level = $${p++}`); params.push(level); }
    if (urlPath) { conditions.push(`path ILIKE $${p++}`); params.push(`%${urlPath}%`); }
    if (statusCode) { conditions.push(`status_code = $${p++}`); params.push(parseInt(statusCode)); }
    if (from) { conditions.push(`logged_at >= $${p++}`); params.push(from); }
    if (to)   { conditions.push(`logged_at <= $${p++}`); params.push(to); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [{ rows: countRows }, { rows }] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM error_log ${where}`, params),
      db.query(
        `SELECT id, level, message, stack, method, path, user_id, status_code, context, logged_at
         FROM error_log ${where}
         ORDER BY logged_at DESC
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

exports.clearErrorLog = async (req, res, next) => {
  try {
    const { olderThanDays } = req.body;
    let result;
    if (olderThanDays && parseInt(olderThanDays) > 0) {
      result = await db.query(
        `DELETE FROM error_log WHERE logged_at < NOW() - ($1 || ' days')::INTERVAL`,
        [parseInt(olderThanDays)]
      );
    } else {
      result = await db.query('DELETE FROM error_log');
    }
    res.json({ deleted: result.rowCount });
  } catch (err) { next(err); }
};

exports.getRetentionPolicies = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT table_name, retention_days FROM audit_retention_policies ORDER BY table_name'
    );
    const map = Object.fromEntries(rows.map(r => [r.table_name, r.retention_days]));
    const result = RETENTION_TABLES.map(t => ({ table_name: t, retention_days: map[t] ?? null }));
    res.json(result);
  } catch (err) { next(err); }
};

exports.saveRetentionPolicies = async (req, res, next) => {
  try {
    // req.body: [{ table_name, retention_days }]  retention_days=null means delete the policy
    const policies = req.body;
    if (!Array.isArray(policies)) return res.status(400).json({ error: 'Expected array' });

    for (const { table_name, retention_days } of policies) {
      if (!ALLOWED_TABLES.includes(table_name)) continue;
      if (retention_days === null || retention_days === '') {
        await db.query('DELETE FROM audit_retention_policies WHERE table_name = $1', [table_name]);
      } else {
        const days = parseInt(retention_days);
        if (isNaN(days) || days < 1) continue;
        await db.query(
          `INSERT INTO audit_retention_policies (table_name, retention_days, updated_by, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (table_name) DO UPDATE SET retention_days = $2, updated_by = $3, updated_at = NOW()`,
          [table_name, days, req.user.id]
        );
      }
    }
    res.json({ message: 'Retention policies saved' });
  } catch (err) { next(err); }
};

exports.purgeByRetention = async (req, res, next) => {
  try {
    const { rows: policies } = await db.query(
      'SELECT table_name, retention_days FROM audit_retention_policies'
    );

    if (!policies.length) return res.json({ purged: [], totalDeleted: 0 });

    const purged = [];
    let totalDeleted = 0;

    for (const { table_name, retention_days } of policies) {
      let rowCount;
      if (table_name === 'error_log') {
        ({ rowCount } = await db.query(
          `DELETE FROM error_log WHERE logged_at < NOW() - ($1 || ' days')::INTERVAL`,
          [retention_days]
        ));
      } else {
        ({ rowCount } = await db.query(
          `DELETE FROM audit_log
           WHERE table_name = $1
             AND changed_at < NOW() - ($2 || ' days')::INTERVAL`,
          [table_name, retention_days]
        ));
      }
      if (rowCount > 0) {
        purged.push({ table_name, deleted: rowCount, retention_days });
        totalDeleted += rowCount;
      }
    }

    res.json({ purged, totalDeleted });
  } catch (err) { next(err); }
};
