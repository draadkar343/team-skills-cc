const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

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

// Public (no auth) — returns only safe display config for the login page
exports.getPublicConfig = async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      "SELECT key, value FROM system_config WHERE key IN ('company_name','company_logo','login_bg')"
    );
    const config = {};
    rows.forEach(r => { config[r.key] = r.value; });
    res.json(config);
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

exports.uploadLoginBg = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Remove old background file if present
    const { rows } = await db.query("SELECT value FROM system_config WHERE key = 'login_bg'");
    if (rows.length && rows[0].value) {
      const oldPath = path.join(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'), path.basename(rows[0].value));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const bgPath = `/uploads/${req.file.filename}`;
    await db.query(
      `INSERT INTO system_config (key, value, updated_by, updated_at)
       VALUES ('login_bg', $1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_by = $2, updated_at = NOW()`,
      [bgPath, req.user.id]
    );
    res.json({ bgUrl: bgPath });
  } catch (err) { next(err); }
};

exports.removeLoginBg = async (req, res, next) => {
  try {
    const { rows } = await db.query("SELECT value FROM system_config WHERE key = 'login_bg'");
    if (rows.length && rows[0].value) {
      const oldPath = path.join(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'), path.basename(rows[0].value));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await db.query(
      `INSERT INTO system_config (key, value, updated_by, updated_at)
       VALUES ('login_bg', NULL, $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = NULL, updated_by = $1, updated_at = NOW()`,
      [req.user.id]
    );
    res.json({ message: 'Login background removed' });
  } catch (err) { next(err); }
};

exports.uploadResumeTemplate = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Remove old template file if present
    const { rows } = await db.query("SELECT value FROM system_config WHERE key = 'resume_template_docx'");
    if (rows.length && rows[0].value) {
      const oldPath = path.join(uploadDir, path.basename(rows[0].value));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const templatePath = `/uploads/${req.file.filename}`;
    await db.query(
      `INSERT INTO system_config (key, value, description, updated_by, updated_at)
       VALUES ('resume_template_docx', $1, 'Word document template for employee resumes', $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_by = $2, updated_at = NOW()`,
      [templatePath, req.user.id]
    );
    res.json({ templatePath });
  } catch (err) { next(err); }
};

exports.deleteResumeTemplate = async (req, res, next) => {
  try {
    const { rows } = await db.query("SELECT value FROM system_config WHERE key = 'resume_template_docx'");
    if (rows.length && rows[0].value) {
      const oldPath = path.join(uploadDir, path.basename(rows[0].value));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await db.query(
      `INSERT INTO system_config (key, value, updated_by, updated_at)
       VALUES ('resume_template_docx', NULL, $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = NULL, updated_by = $1, updated_at = NOW()`,
      [req.user.id]
    );
    res.json({ message: 'Resume template removed' });
  } catch (err) { next(err); }
};

exports.generateResume = async (req, res, next) => {
  try {
    const { rows: cfgRows } = await db.query("SELECT value FROM system_config WHERE key = 'resume_template_docx'");
    if (!cfgRows.length || !cfgRows[0].value) {
      return res.status(404).json({ error: 'No resume template configured' });
    }

    const templatePath = path.join(uploadDir, path.basename(cfgRows[0].value));
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template file not found on server' });
    }

    const userId = req.user.id;
    const [{ rows: userRows }, { rows: skillRows }] = await Promise.all([
      db.query(
        `SELECT u.first_name, u.last_name, u.biography, jr.name AS job_role_name
         FROM users u
         LEFT JOIN job_roles jr ON jr.id = u.job_role_id
         WHERE u.id = $1`,
        [userId]
      ),
      db.query(
        `SELECT es.weighting, sc.name AS skill_name, ms.name AS main_skill_name
         FROM employee_skills es
         JOIN skills_catalogue sc ON sc.id = es.skill_id
         LEFT JOIN main_skills ms ON ms.id = sc.main_skill_id
         WHERE es.user_id = $1 AND es.status = 'approved'
         ORDER BY ms.name, sc.name`,
        [userId]
      ),
    ]);

    if (!userRows.length) return res.status(404).json({ error: 'User not found' });
    const user = userRows[0];

    // Group skills by main skill name
    const groupMap = {};
    skillRows.forEach(s => {
      const group = s.main_skill_name || 'Other';
      if (!groupMap[group]) groupMap[group] = [];
      groupMap[group].push({ skillName: s.skill_name, weighting: s.weighting });
    });
    const skillGroups = Object.entries(groupMap).map(([mainSkillName, skills]) => ({ mainSkillName, skills }));

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    doc.render({
      fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      jobRole: user.job_role_name || '',
      biography: user.biography || '',
      skillGroups,
    });

    const buf = doc.getZip().generate({ type: 'nodebuffer' });
    const safeFirst = (user.first_name || 'Resume').replace(/[^a-zA-Z0-9]/g, '');
    const safeLast = (user.last_name || '').replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${safeFirst}${safeLast ? '_' + safeLast : ''}_Resume.docx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    res.send(buf);
  } catch (err) {
    if (err.properties && err.properties.errors) {
      return next(new Error(`Template error: ${err.properties.errors.map(e => e.message).join(', ')}`));
    }
    next(err);
  }
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
