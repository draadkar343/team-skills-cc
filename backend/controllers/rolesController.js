const db = require('../config/db');

const ALL_PERMISSIONS = [
  // Personal
  { key: 'page.dashboard',            label: 'Dashboard',            category: 'Personal' },
  { key: 'page.my_skills',            label: 'My Skills',            category: 'Personal' },
  { key: 'page.timesheets',           label: 'Timesheets',           category: 'Personal' },
  { key: 'page.my_certifications',    label: 'My Certifications',    category: 'Personal' },
  { key: 'page.biography',            label: 'My Biography',         category: 'Personal' },
  // Leave & Calendar
  { key: 'page.my_leave',             label: 'My Leave',             category: 'Leave & Calendar' },
  { key: 'page.team_calendar',        label: 'Team Calendar',        category: 'Leave & Calendar' },
  { key: 'page.kudos',                label: 'Recognition',          category: 'Leave & Calendar' },
  // Approvals
  { key: 'page.skill_approvals',      label: 'Skill Approvals',      category: 'Approvals' },
  { key: 'page.cert_approvals',       label: 'Cert Approvals',       category: 'Approvals' },
  { key: 'page.timesheet_approvals',  label: 'Timesheet Approvals',  category: 'Approvals' },
  { key: 'page.leave_approvals',      label: 'Leave Approvals',      category: 'Approvals' },
  // Team & Clients
  { key: 'page.squad',                label: 'My Squad',             category: 'Team & Clients' },
  { key: 'page.main_skills',          label: 'Main Skills',          category: 'Team & Clients' },
  { key: 'page.clients',              label: 'Clients',              category: 'Team & Clients' },
  { key: 'page.client_planning',      label: 'Client Planning',      category: 'Team & Clients' },
  { key: 'page.skills_heatmap',       label: 'Skills Heatmap',       category: 'Team & Clients' },
  { key: 'page.workload',             label: 'Workload View',        category: 'Team & Clients' },
  // Resourcing
  { key: 'page.resourcing_dashboard', label: 'Resourcing Dashboard', category: 'Resourcing' },
  { key: 'page.resourcing',           label: 'Resourcing Overview',  category: 'Resourcing' },
  { key: 'page.talent_pipeline',      label: 'Talent Pipeline',      category: 'Resourcing' },
  // Administration
  { key: 'page.admin_dashboard',      label: 'Dashboard',            category: 'Administration' },
  { key: 'page.admin_users',          label: 'Users',                category: 'Administration' },
  { key: 'page.admin_squads',         label: 'Squads',               category: 'Administration' },
  { key: 'page.admin_job_roles',      label: 'Job Roles',            category: 'Administration' },
  { key: 'page.admin_skills',         label: 'Skills Catalogue',     category: 'Administration' },
  { key: 'page.admin_all_skills',     label: 'All Employee Skills',  category: 'Administration' },
  { key: 'page.admin_all_timesheets', label: 'All Timesheets',       category: 'Administration' },
  { key: 'page.admin_certifications', label: 'Certifications',       category: 'Administration' },
  { key: 'page.admin_leave_types',    label: 'Leave Types',          category: 'Administration' },
  { key: 'page.admin_integrations',   label: 'Integrations',         category: 'Administration' },
  { key: 'page.admin_news',           label: 'News',                 category: 'Administration' },
  { key: 'page.admin_config',         label: 'System Config',        category: 'Administration' },
  { key: 'page.admin_audit',          label: 'Audit Log',            category: 'Administration' },
  { key: 'page.admin_roles',          label: 'Role Management',      category: 'Administration' },
];

// GET /roles  (admin only)
exports.listRoles = async (req, res, next) => {
  try {
    const { rows: roles } = await db.query('SELECT * FROM system_roles ORDER BY name');
    const { rows: perms } = await db.query('SELECT role_name, permission FROM role_permissions');

    const permMap = {};
    for (const p of perms) {
      (permMap[p.role_name] = permMap[p.role_name] || []).push(p.permission);
    }

    res.json({
      roles: roles.map(r => ({ ...r, permissions: permMap[r.name] || [] })),
      allPermissions: ALL_PERMISSIONS,
    });
  } catch (err) { next(err); }
};

// PATCH /roles/:name  (admin only)
exports.updateRole = async (req, res, next) => {
  try {
    const { displayName, description, color } = req.body;
    const { rows } = await db.query(
      `UPDATE system_roles SET
        display_name = COALESCE($1, display_name),
        description  = COALESCE($2, description),
        color        = COALESCE($3, color),
        updated_at   = NOW()
       WHERE name = $4 RETURNING *`,
      [displayName, description, color, req.params.name]
    );
    if (!rows.length) return res.status(404).json({ error: 'Role not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// PUT /roles/:name/permissions  (admin only)
exports.saveRolePermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions array required' });

    const validKeys = new Set(ALL_PERMISSIONS.map(p => p.key));
    const invalid = permissions.filter(p => !validKeys.has(p));
    if (invalid.length) return res.status(400).json({ error: `Unknown permissions: ${invalid.join(', ')}` });

    const { rows: check } = await db.query('SELECT name FROM system_roles WHERE name = $1', [req.params.name]);
    if (!check.length) return res.status(404).json({ error: 'Role not found' });

    await db.query('DELETE FROM role_permissions WHERE role_name = $1', [req.params.name]);
    if (permissions.length) {
      const vals = permissions.map((_, i) => `($1, $${i + 2})`).join(', ');
      await db.query(
        `INSERT INTO role_permissions (role_name, permission) VALUES ${vals}`,
        [req.params.name, ...permissions]
      );
    }
    res.json({ role: req.params.name, permissions });
  } catch (err) { next(err); }
};

// GET /auth/my-permissions  (any authenticated user)
exports.getMyPermissions = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT permission FROM role_permissions WHERE role_name = $1',
      [req.user.role]
    );
    res.json(rows.map(r => r.permission));
  } catch (err) { next(err); }
};
