const cron = require('node-cron');
const db = require('../config/db');
const email = require('./emailService');

/**
 * Finds all active users whose birthday is today, sends them a birthday wish,
 * and notifies their squad manager.
 */
async function runBirthdayJob() {
  console.log('[birthday] Running birthday check...');
  try {
    const { rows } = await db.query(`
      SELECT
        u.id, u.email, u.first_name, u.last_name,
        m.email   AS manager_email,
        m.first_name AS manager_first_name,
        m.last_name  AS manager_last_name
      FROM users u
      LEFT JOIN squad_members sm ON sm.user_id = u.id
      LEFT JOIN squads sq        ON sq.id = sm.squad_id
      LEFT JOIN users m          ON m.id = sq.manager_id
      WHERE EXTRACT(MONTH FROM u.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY   FROM u.date_of_birth) = EXTRACT(DAY   FROM CURRENT_DATE)
        AND u.is_active = TRUE
        AND u.date_of_birth IS NOT NULL
    `);

    if (rows.length === 0) {
      console.log('[birthday] No birthdays today.');
      return;
    }

    for (const user of rows) {
      const employeeName = `${user.first_name} ${user.last_name}`;
      console.log(`[birthday] Sending wish to ${employeeName} (${user.email})`);
      email.sendBirthdayWish(user.email, user.first_name);

      if (user.manager_email) {
        const managerName = `${user.manager_first_name} ${user.manager_last_name}`;
        console.log(`[birthday] Notifying manager ${managerName} (${user.manager_email})`);
        email.sendBirthdayReminder(user.manager_email, user.manager_first_name, employeeName);
      }
    }

    console.log(`[birthday] Processed ${rows.length} birthday(s).`);
  } catch (err) {
    console.error('[birthday] Job failed:', err.message);
  }
}

/**
 * Schedules the birthday job to run daily at 08:00.
 */
function scheduleBirthdayJob() {
  cron.schedule('0 8 * * *', runBirthdayJob, { timezone: process.env.TZ || 'UTC' });
  console.log('[birthday] Scheduled daily birthday check at 08:00');
}

module.exports = { scheduleBirthdayJob, runBirthdayJob };
