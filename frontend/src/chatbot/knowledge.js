/**
 * Chatbot knowledge base.
 * Each entry has:
 *   keywords  – array of strings to match against the lowercased user input
 *   roles     – which roles see this entry ('all' or array of role strings)
 *   response  – text or JSX-compatible string returned to the user
 *   suggestions – optional follow-up quick-reply labels
 */

export const entries = [
  // ── Universal ────────────────────────────────────────────────────────────

  {
    keywords: ['hello', 'hi', 'hey', 'help', 'start', 'what can you do'],
    roles: 'all',
    response: (role) => {
      const roleHints = {
        employee: 'submitting skills, logging timesheets, adding certifications, or updating your profile',
        manager:  'approving skills, timesheets or certifications, managing your squad, or navigating approvals',
        administrator: 'managing users, squads, job roles, the skills catalogue, system config, or viewing audit logs',
      };
      return `Hi! I can help you navigate the app. Ask me about ${roleHints[role] || 'using the app'}.`;
    },
    suggestions: (role) => ({
      employee:      ['How do I submit skills?', 'How do I log a timesheet?', 'How do I update my profile?'],
      manager:       ['How do I approve skills?', 'How do I manage my squad?', 'How do I approve timesheets?'],
      administrator: ['How do I create a user?', 'How do I manage squads?', 'Where is system config?'],
    }[role] || ['How do I update my profile?']),
  },

  {
    keywords: ['profile', 'update profile', 'change name', 'change email', 'birthday', 'date of birth', 'avatar', 'picture', 'photo'],
    roles: 'all',
    response: () => 'Go to **My Profile** (your name in the sidebar or navbar). There you can update your name, email, date of birth, job role, biography, and profile picture. You can also change your password there.',
    suggestions: () => ['How do I change my password?'],
  },

  {
    keywords: ['password', 'change password', 'reset password'],
    roles: 'all',
    response: () => 'To change your own password, go to **My Profile** and scroll to the "Change Password" section. If you\'ve forgotten your password, use the "Forgot password" link on the login page.',
    suggestions: () => ['How do I update my profile?'],
  },

  {
    keywords: ['dashboard', 'home', 'overview'],
    roles: 'all',
    response: (role) => ({
      employee:      'Your **Dashboard** shows a summary of your pending skills, timesheet status, and recent activity. Use the sidebar to navigate to specific sections.',
      manager:       'Your **Dashboard** shows items pending your approval — skills, timesheets, and certifications from your squad. Click any item to go straight to the approvals page.',
      administrator: 'The **Admin Dashboard** gives a high-level overview of users, pending approvals, and system activity. Use the sidebar to navigate to any admin section.',
    }[role] || 'The dashboard shows a summary of your activity.'),
    suggestions: (role) => ({
      employee:      ['How do I submit skills?', 'How do I log a timesheet?'],
      manager:       ['How do I approve skills?', 'How do I manage my squad?'],
      administrator: ['How do I create a user?', 'Where is system config?'],
    }[role] || []),
  },

  // ── Employee ─────────────────────────────────────────────────────────────

  {
    keywords: ['skill', 'add skill', 'submit skill', 'weighting', 'my skill'],
    roles: ['employee'],
    response: () => 'Go to **My Skills** in the sidebar.\n\n1. Click **Add Skill** and choose a skill from the catalogue.\n2. Set a weighting (0–100%) to show your confidence level.\n3. Optionally add notes.\n4. Save as a draft, or click **Submit** to send it to your manager for approval.',
    suggestions: () => ['What does the weighting mean?', 'What happens after I submit?'],
  },

  {
    keywords: ['weighting', 'confidence', 'percentage', 'skill level'],
    roles: ['employee'],
    response: () => 'The **weighting** (0–100%) represents how confident or proficient you are in a skill. 100% means you are fully expert; lower values indicate developing proficiency. Your manager sees this when reviewing your skills.',
    suggestions: () => ['How do I submit skills?'],
  },

  {
    keywords: ['skill status', 'skill approved', 'skill rejected', 'pending skill', 'what happens after'],
    roles: ['employee'],
    response: () => 'After you submit a skill it goes to **Pending** status. Your manager will review and either approve or reject it. You\'ll receive an email notification either way. Rejected skills can be edited and resubmitted.',
    suggestions: () => ['How do I submit skills?'],
  },

  {
    keywords: ['timesheet', 'log time', 'hours', 'submit timesheet', 'week'],
    roles: ['employee'],
    response: () => 'Go to **Timesheets** in the sidebar.\n\n1. Click **New Timesheet** and select the week start date.\n2. Add daily entries with hours, project code, and a description.\n3. Save as draft, or click **Submit** to send to your manager for approval.',
    suggestions: () => ['What happens after I submit a timesheet?'],
  },

  {
    keywords: ['timesheet approved', 'timesheet rejected', 'timesheet status'],
    roles: ['employee'],
    response: () => 'After submitting a timesheet it goes to **Pending** and your manager is notified. They\'ll approve or reject it. If rejected, you can edit and resubmit it.',
    suggestions: () => ['How do I log a timesheet?'],
  },

  {
    keywords: ['certification', 'cert', 'certificate', 'add certification', 'my cert'],
    roles: ['employee'],
    response: () => 'Go to **My Certifications** in the sidebar.\n\n1. Click **Add Certification**.\n2. Enter the name, provider, date obtained, and optional expiry date.\n3. Optionally attach a URL to your certificate.\n4. Submit it for manager approval.',
    suggestions: () => ['What happens after I submit a certification?'],
  },

  {
    keywords: ['biography', 'bio', 'about me', 'summary'],
    roles: ['employee'],
    response: () => 'Go to **Biography** in the sidebar. You can write a professional summary about yourself here. This is used in your generated resume/CV.',
    suggestions: () => ['How do I update my profile?'],
  },

  // ── Manager ──────────────────────────────────────────────────────────────

  {
    keywords: ['approve skill', 'reject skill', 'skill approval', 'review skill'],
    roles: ['manager'],
    response: () => 'Go to **Skill Approvals** in the sidebar. You\'ll see all pending submissions from your squad.\n\n- Click **Approve** to approve a skill.\n- Click **Reject** to reject it — you\'ll be asked to provide a reason.\n\nThe employee is notified by email either way.',
    suggestions: () => ['How do I approve timesheets?', 'How do I manage my squad?'],
  },

  {
    keywords: ['approve timesheet', 'reject timesheet', 'timesheet approval'],
    roles: ['manager'],
    response: () => 'Go to **Timesheet Approvals** in the sidebar. Review each submission, then click **Approve** or **Reject** (with a reason). The employee is notified by email.',
    suggestions: () => ['How do I approve skills?', 'How do I manage my squad?'],
  },

  {
    keywords: ['approve cert', 'reject cert', 'certification approval'],
    roles: ['manager'],
    response: () => 'Go to **Cert Approvals** in the sidebar to review certification submissions from your squad. Approve or reject each one — the employee gets an email notification.',
    suggestions: () => ['How do I approve skills?'],
  },

  {
    keywords: ['squad', 'team', 'manage squad', 'add member', 'remove member'],
    roles: ['manager'],
    response: () => 'Go to **My Squad** in the sidebar. You can see your squad members, their job roles, and skill summaries. Use **Add Member** to assign an employee to your squad, or remove them if needed.',
    suggestions: () => ['How do I approve skills?'],
  },

  {
    keywords: ['main skill', 'required skill', 'skill framework'],
    roles: ['manager'],
    response: () => 'Go to **Main Skills** in the sidebar. Here you can define the core skills expected for each job role. These act as a framework your employees can use when adding their own skills.',
    suggestions: () => ['How do I manage my squad?'],
  },

  // ── Administrator ────────────────────────────────────────────────────────

  {
    keywords: ['create user', 'new user', 'add user', 'invite user'],
    roles: ['administrator'],
    response: () => 'Go to **User Management** (Admin → Users). Click **+ New User**, fill in their name, email, and a temporary password. They\'ll receive a welcome email. New users are always created as Employees — promote them via Edit.',
    suggestions: () => ['How do I change a user\'s role?', 'How do I deactivate a user?'],
  },

  {
    keywords: ['role', 'change role', 'promote', 'make manager', 'make admin'],
    roles: ['administrator'],
    response: () => 'Go to **Admin → Users**, find the user, and click **Edit**. Change the Role dropdown to Employee, Manager, or Administrator, then save.',
    suggestions: () => ['How do I create a user?'],
  },

  {
    keywords: ['deactivate', 'disable user', 'remove user', 'delete user'],
    roles: ['administrator'],
    response: () => 'Go to **Admin → Users**, find the user, and click **Deactivate**. This disables their login without deleting their data. Deactivated users can be reactivated by editing them and toggling their status.',
    suggestions: () => ['How do I create a user?'],
  },

  {
    keywords: ['manage squad', 'admin squad', 'assign manager', 'squad management'],
    roles: ['administrator'],
    response: () => 'Go to **Admin → Squads**. Here you can create squads, assign managers, and move employees between squads.',
    suggestions: () => ['How do I create a user?'],
  },

  {
    keywords: ['job role', 'job title', 'manage job role'],
    roles: ['administrator'],
    response: () => 'Go to **Admin → Job Roles** to add, edit, or deactivate job roles. Job roles can be assigned to users and linked to skills in the catalogue.',
    suggestions: () => ['How do I manage the skills catalogue?'],
  },

  {
    keywords: ['skill catalogue', 'skills catalogue', 'manage skill', 'add skill to catalogue'],
    roles: ['administrator'],
    response: () => 'Go to **Admin → Skills** to manage the skills catalogue. You can add skills, assign them to categories, link them to job roles, and activate or deactivate them.',
    suggestions: () => ['How do I manage job roles?'],
  },

  {
    keywords: ['all timesheet', 'view timesheets', 'all employee timesheet'],
    roles: ['administrator'],
    response: () => 'Go to **Admin → All Timesheets** to view and filter timesheets across all employees.',
    suggestions: () => ['How do I manage users?'],
  },

  {
    keywords: ['config', 'system config', 'company name', 'logo', 'settings'],
    roles: ['administrator'],
    response: () => 'Go to **Admin → System Config**. Here you can set the company name, upload a logo, change the login page background image, and configure other system-wide settings.',
    suggestions: () => ['Where is the audit log?'],
  },

  {
    keywords: ['audit', 'audit log', 'activity log', 'history'],
    roles: ['administrator'],
    response: () => 'Go to **Admin → Audit Log** to see a full history of changes across all business data — who changed what and when. You can also set retention policies to automatically purge old records.',
    suggestions: () => ['Where is system config?'],
  },

  {
    keywords: ['news', 'announcement', 'post news', 'manage news'],
    roles: ['administrator'],
    response: () => 'Go to **Admin → News** to create and manage announcements. News items can be targeted to specific job roles or shown to everyone.',
    suggestions: () => ['Where is system config?'],
  },

  {
    keywords: ['integration', 'webhook', 'api key', 'external'],
    roles: ['administrator'],
    response: () => 'Go to **Admin → Integrations** to manage webhooks, API keys, and external service connections.',
    suggestions: () => ['Where is system config?'],
  },
];

/**
 * Find the best matching entry for the user's message and their role.
 * Returns { response, suggestions } or null if nothing matched.
 */
export function findAnswer(message, role) {
  const input = message.toLowerCase();

  // Filter to entries relevant to this role
  const relevant = entries.filter(e => e.roles === 'all' || e.roles.includes(role));

  // Score each entry by how many keywords match
  let best = null;
  let bestScore = 0;

  for (const entry of relevant) {
    const score = entry.keywords.reduce((acc, kw) => acc + (input.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (!best || bestScore === 0) return null;

  return {
    response:    typeof best.response    === 'function' ? best.response(role)    : best.response,
    suggestions: typeof best.suggestions === 'function' ? best.suggestions(role) : (best.suggestions || []),
  };
}

/**
 * Returns the default greeting and suggestions for the given role.
 */
export function getGreeting(role) {
  const greeting = entries[0];
  return {
    response:    greeting.response(role),
    suggestions: greeting.suggestions(role),
  };
}
