const nodemailer = require('nodemailer');

// ── Transport ──────────────────────────────────────────────────────────────

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: parseInt(SMTP_PORT || '587') === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendMail(to, subject, html) {
  const transport = createTransport();
  if (!transport) {
    console.warn(`[email] SMTP not configured — skipping: "${subject}" → ${to}`);
    return;
  }
  try {
    await transport.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Skills Management'}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    // Never let email failures break the main request
    console.error('[email] Failed to send:', err.message);
  }
}

// ── Template helper ────────────────────────────────────────────────────────

function layout(title, body) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
      <h2 style="color:#1d4ed8;margin-bottom:8px">${title}</h2>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0"/>
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px"/>
      <p style="font-size:12px;color:#9ca3af">Skills Management System — this is an automated notification.</p>
    </div>`;
}

// ── Notification functions ──────────────────────────────────────────────────

/**
 * Welcome email sent when a new user account is created.
 */
exports.sendWelcome = (to, firstName, password) =>
  sendMail(
    to,
    'Welcome to Skills Management',
    layout(
      `Welcome, ${firstName}!`,
      `<p>Your account has been created. Use the details below to sign in.</p>
       <p><strong>Email:</strong> ${to}<br/>
       <strong>Password:</strong> ${password}</p>
       <p style="color:#6b7280;font-size:13px">Please change your password after your first login.</p>`
    )
  );

/**
 * Notify a manager that an employee has submitted skills for review.
 */
exports.sendSkillsSubmitted = (managerEmail, managerName, employeeName, skillCount) =>
  sendMail(
    managerEmail,
    `Skills awaiting your approval — ${employeeName}`,
    layout(
      'Skills Submitted for Approval',
      `<p>Hi ${managerName},</p>
       <p><strong>${employeeName}</strong> has submitted <strong>${skillCount}</strong> skill(s) for your review.</p>
       <p>Please log in to approve or reject them.</p>`
    )
  );

/**
 * Notify an employee that their skill was approved.
 */
exports.sendSkillApproved = (employeeEmail, employeeName, skillName, managerName) =>
  sendMail(
    employeeEmail,
    `Skill approved: ${skillName}`,
    layout(
      'Your Skill Has Been Approved',
      `<p>Hi ${employeeName},</p>
       <p>Your skill <strong>${skillName}</strong> has been <span style="color:#16a34a">approved</span> by ${managerName}.</p>`
    )
  );

/**
 * Notify an employee that their skill was rejected.
 */
exports.sendSkillRejected = (employeeEmail, employeeName, skillName, managerName, reason) =>
  sendMail(
    employeeEmail,
    `Skill rejected: ${skillName}`,
    layout(
      'Your Skill Was Not Approved',
      `<p>Hi ${employeeName},</p>
       <p>Your skill <strong>${skillName}</strong> has been <span style="color:#dc2626">rejected</span> by ${managerName}.</p>
       <p><strong>Reason:</strong> ${reason}</p>
       <p>You can update the skill and resubmit it for approval.</p>`
    )
  );

/**
 * Notify a manager that an employee has submitted a timesheet for review.
 */
exports.sendTimesheetSubmitted = (managerEmail, managerName, employeeName, weekStart, totalHours) =>
  sendMail(
    managerEmail,
    `Timesheet awaiting approval — ${employeeName}`,
    layout(
      'Timesheet Submitted for Approval',
      `<p>Hi ${managerName},</p>
       <p><strong>${employeeName}</strong> has submitted a timesheet for the week of <strong>${weekStart}</strong> (${totalHours} hours).</p>
       <p>Please log in to approve or reject it.</p>`
    )
  );

/**
 * Notify an employee that their timesheet was approved.
 */
exports.sendTimesheetApproved = (employeeEmail, employeeName, weekStart, managerName) =>
  sendMail(
    employeeEmail,
    `Timesheet approved — week of ${weekStart}`,
    layout(
      'Your Timesheet Has Been Approved',
      `<p>Hi ${employeeName},</p>
       <p>Your timesheet for the week of <strong>${weekStart}</strong> has been <span style="color:#16a34a">approved</span> by ${managerName}.</p>`
    )
  );

/**
 * Notify an employee that their timesheet was rejected.
 */
exports.sendTimesheetRejected = (employeeEmail, employeeName, weekStart, managerName, reason) =>
  sendMail(
    employeeEmail,
    `Timesheet rejected — week of ${weekStart}`,
    layout(
      'Your Timesheet Was Not Approved',
      `<p>Hi ${employeeName},</p>
       <p>Your timesheet for the week of <strong>${weekStart}</strong> has been <span style="color:#dc2626">rejected</span> by ${managerName}.</p>
       <p><strong>Reason:</strong> ${reason}</p>
       <p>Please correct your timesheet and resubmit.</p>`
    )
  );

/**
 * Notify a manager that an employee submitted a certification for review.
 */
exports.sendCertSubmitted = (managerEmail, managerName, employeeName, certName) =>
  sendMail(
    managerEmail,
    `Certification awaiting approval — ${employeeName}`,
    layout(
      'Certification Submitted for Approval',
      `<p>Hi ${managerName},</p>
       <p><strong>${employeeName}</strong> has submitted the certification <strong>${certName}</strong> for your review.</p>
       <p>Please log in to approve or reject it.</p>`
    )
  );

/**
 * Notify an employee that their certification was approved.
 */
exports.sendCertApproved = (employeeEmail, employeeName, certName, managerName) =>
  sendMail(
    employeeEmail,
    `Certification approved: ${certName}`,
    layout(
      'Your Certification Has Been Approved',
      `<p>Hi ${employeeName},</p>
       <p>Your certification <strong>${certName}</strong> has been <span style="color:#16a34a">approved</span> by ${managerName}.</p>`
    )
  );

/**
 * Notify an employee that their certification was rejected.
 */
exports.sendCertRejected = (employeeEmail, employeeName, certName, managerName, reason) =>
  sendMail(
    employeeEmail,
    `Certification rejected: ${certName}`,
    layout(
      'Your Certification Was Not Approved',
      `<p>Hi ${employeeName},</p>
       <p>Your certification <strong>${certName}</strong> has been <span style="color:#dc2626">rejected</span> by ${managerName}.</p>
       <p><strong>Reason:</strong> ${reason}</p>
       <p>You can update the certification and resubmit it for approval.</p>`
    )
  );

/**
 * Send a password reset link to the user.
 */
exports.sendPasswordReset = (to, firstName, resetUrl) =>
  sendMail(
    to,
    'Reset your password',
    layout(
      'Password Reset Request',
      `<p>Hi ${firstName},</p>
       <p>We received a request to reset your password. Click the button below to choose a new one.</p>
       <p style="margin:24px 0">
         <a href="${resetUrl}" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500">Reset Password</a>
       </p>
       <p style="color:#6b7280;font-size:13px">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>`
    )
  );

/**
 * Birthday wish sent directly to the employee on their birthday.
 */
exports.sendBirthdayWish = (to, firstName) =>
  sendMail(
    to,
    `Happy Birthday, ${firstName}! 🎂`,
    layout(
      `Happy Birthday, ${firstName}!`,
      `<p>Wishing you a wonderful birthday from everyone at the team.</p>
       <p>We hope you have a fantastic day!</p>`
    )
  );

/**
 * Birthday reminder sent to the squad manager about a team member's birthday.
 */
exports.sendBirthdayReminder = (managerEmail, managerName, employeeName) =>
  sendMail(
    managerEmail,
    `Birthday reminder: ${employeeName} 🎂`,
    layout(
      "Team Birthday Reminder",
      `<p>Hi ${managerName},</p>
       <p>Just a heads-up — today is <strong>${employeeName}</strong>'s birthday!</p>
       <p>Why not take a moment to wish them a great day?</p>`
    )
  );

/**
 * Notify a user that their email address was changed.
 */
exports.sendEmailChanged = (newEmail, firstName, oldEmail) =>
  sendMail(
    newEmail,
    'Your email address has been updated',
    layout(
      'Email Address Changed',
      `<p>Hi ${firstName},</p>
       <p>Your login email has been changed from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.</p>
       <p>If you did not request this change, please contact your administrator immediately.</p>`
    )
  );
