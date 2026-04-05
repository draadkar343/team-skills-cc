const cron = require('node-cron');
const db = require('../config/db');
const { createNotification } = require('./notificationService');

async function runCrReminderJob() {
  console.log('[cr-reminder] Running change request expiry check...');
  try {
    // Find CRs expiring in exactly 7 days that haven't had a reminder sent
    const { rows: crs } = await db.query(`
      SELECT ccr.id, ccr.title, ccr.quoted_amount, ccr.currency, ccr.expiry_date,
             c.name AS client_name
      FROM client_change_requests ccr
      JOIN clients c ON c.id = ccr.client_id
      WHERE ccr.expiry_date = CURRENT_DATE + INTERVAL '7 days'
        AND ccr.reminder_sent = false
        AND ccr.status NOT IN ('approved', 'rejected', 'cancelled')
    `);

    if (crs.length === 0) {
      console.log('[cr-reminder] No upcoming CR expirations.');
      return;
    }

    // Get all active Application Delivery Managers
    const { rows: adms } = await db.query(`
      SELECT id FROM users WHERE role = 'application_delivery_manager' AND is_active = true
    `);

    if (adms.length === 0) {
      console.log('[cr-reminder] No active ADMs to notify.');
    }

    for (const cr of crs) {
      const valueStr = cr.quoted_amount
        ? ` (${cr.currency || 'USD'} ${Number(cr.quoted_amount).toLocaleString()})`
        : '';
      const title = `Quote Expiring Soon: ${cr.title}`;
      const message = `Change request "${cr.title}" for client ${cr.client_name}${valueStr} expires on ${cr.expiry_date.toISOString().slice(0, 10)}.`;

      for (const adm of adms) {
        await createNotification(adm.id, 'cr_expiry_reminder', title, message);
      }

      // Mark reminder as sent
      await db.query(
        'UPDATE client_change_requests SET reminder_sent = true WHERE id = $1',
        [cr.id]
      );

      console.log(`[cr-reminder] Sent reminder for CR "${cr.title}" to ${adms.length} ADM(s).`);
    }

    console.log(`[cr-reminder] Processed ${crs.length} CR expiry reminder(s).`);
  } catch (err) {
    console.error('[cr-reminder] Job failed:', err.message);
  }
}

function scheduleCrReminderJob() {
  cron.schedule('0 8 * * *', runCrReminderJob, { timezone: process.env.TZ || 'UTC' });
  console.log('[cr-reminder] Scheduled daily CR expiry check at 08:00');
}

module.exports = { scheduleCrReminderJob, runCrReminderJob };
