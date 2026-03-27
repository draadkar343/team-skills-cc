const db = require('../config/db');
const path = require('path');
const fs = require('fs');

const VALID_STAGES = ['sourced', 'cv_review', 'phone_screen', 'panel_interview', 'offer', 'hired', 'rejected'];

// GET /talent
exports.listCandidates = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT tc.*,
              u1.first_name || ' ' || u1.last_name AS created_by_name,
              u2.first_name || ' ' || u2.last_name AS assigned_to_name,
              jr.name AS job_role_name
       FROM talent_candidates tc
       LEFT JOIN users u1 ON u1.id = tc.created_by
       LEFT JOIN users u2 ON u2.id = tc.assigned_to
       LEFT JOIN job_roles jr ON jr.id = tc.job_role_id
       ORDER BY tc.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// GET /talent/:id
exports.getCandidate = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT tc.*,
              u1.first_name || ' ' || u1.last_name AS created_by_name,
              u2.first_name || ' ' || u2.last_name AS assigned_to_name,
              jr.name AS job_role_name
       FROM talent_candidates tc
       LEFT JOIN users u1 ON u1.id = tc.created_by
       LEFT JOIN users u2 ON u2.id = tc.assigned_to
       LEFT JOIN job_roles jr ON jr.id = tc.job_role_id
       WHERE tc.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Candidate not found' });

    const { rows: history } = await db.query(
      `SELECT tsh.*, u.first_name || ' ' || u.last_name AS changed_by_name
       FROM talent_stage_history tsh
       JOIN users u ON u.id = tsh.changed_by
       WHERE tsh.candidate_id = $1
       ORDER BY tsh.created_at ASC`,
      [req.params.id]
    );

    res.json({ ...rows[0], history });
  } catch (err) { next(err); }
};

// POST /talent
exports.createCandidate = async (req, res, next) => {
  try {
    const {
      firstName, lastName, email, phone, linkedinUrl,
      employmentType, jobRoleId, jobRoleText,
      availabilityDate, notes, assignedTo,
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO talent_candidates
         (first_name, last_name, email, phone, linkedin_url,
          employment_type, job_role_id, job_role_text,
          availability_date, notes, assigned_to, created_by, stage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'sourced')
       RETURNING *`,
      [
        firstName, lastName, email || null, phone || null, linkedinUrl || null,
        employmentType || null, jobRoleId || null, jobRoleText || null,
        availabilityDate || null, notes || null,
        assignedTo || null, req.user.id,
      ]
    );

    await db.query(
      `INSERT INTO talent_stage_history (candidate_id, from_stage, to_stage, changed_by, note)
       VALUES ($1, NULL, 'sourced', $2, 'Candidate added')`,
      [rows[0].id, req.user.id]
    );

    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

// PATCH /talent/:id
exports.updateCandidate = async (req, res, next) => {
  try {
    const {
      firstName, lastName, email, phone, linkedinUrl,
      employmentType, jobRoleId, jobRoleText,
      availabilityDate, notes, assignedTo,
      verified, verificationNotes,
      interviewDate, interviewPanel, interviewScore, interviewFeedback,
    } = req.body;

    const { rows } = await db.query(
      `UPDATE talent_candidates SET
         first_name        = COALESCE($1, first_name),
         last_name         = COALESCE($2, last_name),
         email             = $3,
         phone             = $4,
         linkedin_url      = $5,
         employment_type   = $6,
         job_role_id       = $7,
         job_role_text     = $8,
         availability_date = $9,
         notes             = $10,
         assigned_to       = $11,
         verified          = COALESCE($12, verified),
         verification_notes= $13,
         interview_date    = $14,
         interview_panel   = $15,
         interview_score   = $16,
         interview_feedback= $17,
         updated_at        = NOW()
       WHERE id = $18
       RETURNING *`,
      [
        firstName || null, lastName || null,
        email !== undefined ? (email || null) : undefined,
        phone !== undefined ? (phone || null) : undefined,
        linkedinUrl !== undefined ? (linkedinUrl || null) : undefined,
        employmentType !== undefined ? (employmentType || null) : undefined,
        jobRoleId !== undefined ? (jobRoleId || null) : undefined,
        jobRoleText !== undefined ? (jobRoleText || null) : undefined,
        availabilityDate !== undefined ? (availabilityDate || null) : undefined,
        notes !== undefined ? (notes || null) : undefined,
        assignedTo !== undefined ? (assignedTo || null) : undefined,
        verified !== undefined ? verified : null,
        verificationNotes !== undefined ? (verificationNotes || null) : undefined,
        interviewDate !== undefined ? (interviewDate || null) : undefined,
        interviewPanel !== undefined ? (interviewPanel || null) : undefined,
        interviewScore !== undefined ? (interviewScore || null) : undefined,
        interviewFeedback !== undefined ? (interviewFeedback || null) : undefined,
        req.params.id,
      ]
    );

    if (!rows.length) return res.status(404).json({ error: 'Candidate not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

// POST /talent/:id/stage
exports.changeStage = async (req, res, next) => {
  try {
    const { stage, note } = req.body;
    if (!VALID_STAGES.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` });
    }

    const { rows: current } = await db.query('SELECT stage FROM talent_candidates WHERE id = $1', [req.params.id]);
    if (!current.length) return res.status(404).json({ error: 'Candidate not found' });

    const fromStage = current[0].stage;

    await db.query(
      'UPDATE talent_candidates SET stage = $1, updated_at = NOW() WHERE id = $2',
      [stage, req.params.id]
    );

    await db.query(
      `INSERT INTO talent_stage_history (candidate_id, from_stage, to_stage, changed_by, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, fromStage, stage, req.user.id, note || null]
    );

    res.json({ stage, fromStage });
  } catch (err) { next(err); }
};

// POST /talent/:id/cv
exports.uploadCV = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Remove old CV if exists
    const { rows } = await db.query('SELECT cv_path FROM talent_candidates WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Candidate not found' });
    if (rows[0].cv_path) {
      const oldPath = path.join(__dirname, '../uploads', path.basename(rows[0].cv_path));
      fs.unlink(oldPath, () => {});
    }

    const cvUrl = `/uploads/${req.file.filename}`;
    await db.query(
      'UPDATE talent_candidates SET cv_path = $1, cv_filename = $2, updated_at = NOW() WHERE id = $3',
      [cvUrl, req.file.originalname, req.params.id]
    );

    res.json({ cvPath: cvUrl, cvFilename: req.file.originalname });
  } catch (err) { next(err); }
};

// DELETE /talent/:id/cv
exports.deleteCV = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT cv_path FROM talent_candidates WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Candidate not found' });
    if (rows[0].cv_path) {
      const oldPath = path.join(__dirname, '../uploads', path.basename(rows[0].cv_path));
      fs.unlink(oldPath, () => {});
    }
    await db.query('UPDATE talent_candidates SET cv_path = NULL, cv_filename = NULL, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// DELETE /talent/:id
exports.deleteCandidate = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT cv_path FROM talent_candidates WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Candidate not found' });
    if (rows[0].cv_path) {
      const oldPath = path.join(__dirname, '../uploads', path.basename(rows[0].cv_path));
      fs.unlink(oldPath, () => {});
    }
    await db.query('DELETE FROM talent_candidates WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
