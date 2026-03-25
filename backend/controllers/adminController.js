const db = require('../config/db');
const path = require('path');
const fs = require('fs');

exports.getConfig = async (_req, res, next) => {
  try {
    const { rows } = await db.query('SELECT key, value, description FROM system_config ORDER BY key');
    const config = {};
    rows.forEach(r => { config[r.key] = { value: r.value, description: r.description }; });
    res.json(config);
  } catch (err) { next(err); }
};

exports.updateConfig = async (req, res, next) => {
  try {
    const updates = req.body; // { key: value, ... }
    for (const [key, value] of Object.entries(updates)) {
      await db.query(
        `INSERT INTO system_config (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
        [key, value, req.user.id]
      );
    }
    res.json({ message: 'Config updated' });
  } catch (err) { next(err); }
};

exports.uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Remove old logo file if present
    const { rows } = await db.query("SELECT value FROM system_config WHERE key = 'company_logo'");
    if (rows.length && rows[0].value) {
      const oldPath = path.join(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'), path.basename(rows[0].value));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const logoPath = `/uploads/${req.file.filename}`;
    await db.query(
      "UPDATE system_config SET value = $1, updated_by = $2, updated_at = NOW() WHERE key = 'company_logo'",
      [logoPath, req.user.id]
    );
    res.json({ logoUrl: logoPath });
  } catch (err) { next(err); }
};

exports.getStats = async (_req, res, next) => {
  try {
    const [users, skills, timesheets, pendingSkills, pendingTimesheets] = await Promise.all([
      db.query("SELECT COUNT(*) FROM users WHERE is_active = true"),
      db.query("SELECT COUNT(*) FROM employee_skills WHERE status = 'approved'"),
      db.query("SELECT COUNT(*) FROM timesheets WHERE status = 'approved'"),
      db.query("SELECT COUNT(*) FROM employee_skills WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) FROM timesheets WHERE status = 'pending'"),
    ]);
    res.json({
      activeUsers: parseInt(users.rows[0].count),
      approvedSkills: parseInt(skills.rows[0].count),
      approvedTimesheets: parseInt(timesheets.rows[0].count),
      pendingSkills: parseInt(pendingSkills.rows[0].count),
      pendingTimesheets: parseInt(pendingTimesheets.rows[0].count),
    });
  } catch (err) { next(err); }
};
