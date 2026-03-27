const db = require('../config/db');
const { createNotification } = require('../services/notificationService');

// GET /kudos — company-wide feed, all roles
exports.listKudos = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT k.*,
              fu.first_name || ' ' || fu.last_name AS from_name,
              tu.first_name || ' ' || tu.last_name AS to_name,
              fu.id AS from_id, tu.id AS to_id
       FROM kudos k
       JOIN users fu ON fu.id = k.from_user_id
       JOIN users tu ON tu.id = k.to_user_id
       ORDER BY k.created_at DESC
       LIMIT 100`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// GET /kudos/mine — kudos received by the current user
exports.getMyKudos = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT k.*,
              fu.first_name || ' ' || fu.last_name AS from_name
       FROM kudos k
       JOIN users fu ON fu.id = k.from_user_id
       WHERE k.to_user_id = $1
       ORDER BY k.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// GET /kudos/user/:id — kudos for a specific user (manager/admin)
exports.getUserKudos = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT k.*,
              fu.first_name || ' ' || fu.last_name AS from_name
       FROM kudos k
       JOIN users fu ON fu.id = k.from_user_id
       WHERE k.to_user_id = $1
       ORDER BY k.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

// POST /kudos — any role can send kudos
exports.sendKudos = async (req, res, next) => {
  try {
    const { toUserId, message, category } = req.body;

    if (!toUserId || !message?.trim()) {
      return res.status(400).json({ error: 'Recipient and message are required' });
    }
    if (parseInt(toUserId) === req.user.id) {
      return res.status(400).json({ error: 'You cannot give kudos to yourself' });
    }

    // Get recipient name
    const { rows: recipientRows } = await db.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1 AND is_active = true',
      [toUserId]
    );
    if (!recipientRows.length) return res.status(404).json({ error: 'Recipient not found' });
    const recipient = recipientRows[0];

    // Get sender name
    const { rows: senderRows } = await db.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [req.user.id]
    );
    const senderName = `${senderRows[0].first_name} ${senderRows[0].last_name}`;
    const recipientName = `${recipient.first_name} ${recipient.last_name}`;

    // Insert kudos
    const { rows } = await db.query(
      `INSERT INTO kudos (from_user_id, to_user_id, category, message)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, toUserId, category || null, message.trim()]
    );

    const categoryLabel = category ? ` (${category.replace(/_/g, ' ')})` : '';

    // Notify recipient
    await createNotification(
      toUserId,
      'kudos_received',
      `Recognition from ${senderName}`,
      message.trim()
    );

    // Notify squad manager (if recipient has one, and it's not the sender themselves)
    const { rows: squadRows } = await db.query(
      `SELECT s.manager_id FROM squads s
       JOIN squad_members sm ON sm.squad_id = s.id
       WHERE sm.user_id = $1 LIMIT 1`,
      [toUserId]
    );
    if (squadRows.length && squadRows[0].manager_id !== req.user.id) {
      await createNotification(
        squadRows[0].manager_id,
        'kudos_team',
        `${recipientName} received recognition`,
        `${senderName} recognised ${recipientName}${categoryLabel}: "${message.trim()}"`
      );
    }

    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

// DELETE /kudos/:id — admin only
exports.deleteKudos = async (req, res, next) => {
  try {
    await db.query('DELETE FROM kudos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
