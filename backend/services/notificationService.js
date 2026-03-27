const db = require('../config/db');

async function createNotification(userId, type, title, message) {
  try {
    await db.query(
      'INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)',
      [userId, type, title, message]
    );
  } catch (err) {
    console.error('[notification] Failed to create:', err.message);
  }
}

module.exports = { createNotification };
