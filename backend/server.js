require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const skillRoutes = require('./routes/skillRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');
const squadRoutes = require('./routes/squadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const jobRoleRoutes = require('./routes/jobRoleRoutes');
const auditRoutes = require('./routes/auditRoutes');
const newsRoutes = require('./routes/newsRoutes');
const certsRoutes = require('./routes/certsRoutes');
const integrationsRoutes = require('./routes/integrationsRoutes');
const publicApiRoutes = require('./routes/publicApiRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const clientRoutes = require('./routes/clientRoutes');
const resourcingRoutes = require('./routes/resourcingRoutes');
const talentRoutes = require('./routes/talentRoutes');
const kudosRoutes = require('./routes/kudosRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const rolesRoutes   = require('./routes/rolesRoutes');
const reportRoutes      = require('./routes/reportRoutes');
const onboardingRoutes  = require('./routes/onboardingRoutes');
const orgRoutes         = require('./routes/orgRoutes');
const directoryRoutes   = require('./routes/directoryRoutes');
const errorHandler = require('./middleware/errorHandler');
const db = require('./config/db');
const { scheduleBirthdayJob } = require('./services/birthdayJob');

const app = express();

// Create API integration tables if they don't exist
db.query(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    key_hash     VARCHAR(128) NOT NULL UNIQUE,
    key_prefix   VARCHAR(12) NOT NULL,
    scopes       TEXT[] NOT NULL DEFAULT '{}',
    created_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    last_used_at TIMESTAMPTZ,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create api_keys:', err.message));

db.query(`
  CREATE TABLE IF NOT EXISTS external_integrations (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    base_url    VARCHAR(500) NOT NULL,
    auth_type   VARCHAR(50) NOT NULL DEFAULT 'none',
    auth_config JSONB NOT NULL DEFAULT '{}',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create external_integrations:', err.message));

db.query(`
  CREATE TABLE IF NOT EXISTS webhooks (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    url         VARCHAR(500) NOT NULL,
    secret      VARCHAR(128),
    events      TEXT[] NOT NULL DEFAULT '{}',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create webhooks:', err.message));

db.query(`
  CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id            SERIAL PRIMARY KEY,
    webhook_id    INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event         VARCHAR(100) NOT NULL,
    payload       JSONB NOT NULL,
    response_code INTEGER,
    response_body TEXT,
    success       BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create webhook_deliveries:', err.message));

// Create employee_certifications table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS employee_certifications (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    provider          VARCHAR(255),
    date_obtained     DATE NOT NULL,
    expiration_date   DATE,
    certificate_url   VARCHAR(500),
    notes             TEXT,
    status            workflow_status NOT NULL DEFAULT 'draft',
    submitted_at      TIMESTAMPTZ,
    reviewed_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at       TIMESTAMPTZ,
    rejection_reason  TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create employee_certifications table:', err.message));

// Create news_items table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS news_items (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    body        TEXT NOT NULL,
    job_role_id INTEGER REFERENCES job_roles(id) ON DELETE SET NULL,
    created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create news_items table:', err.message));

// Create error_log table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS error_log (
    id          BIGSERIAL PRIMARY KEY,
    level       VARCHAR(20)  NOT NULL DEFAULT 'error',
    message     TEXT         NOT NULL,
    stack       TEXT,
    method      VARCHAR(10),
    path        VARCHAR(500),
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status_code INTEGER,
    context     JSONB,
    logged_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create error_log:', err.message));

db.query(`
  CREATE INDEX IF NOT EXISTS idx_error_log_logged ON error_log(logged_at DESC)
`).catch(() => {});

// Create audit_retention_policies table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS audit_retention_policies (
    table_name     VARCHAR(100) PRIMARY KEY,
    retention_days INTEGER NOT NULL CHECK (retention_days > 0),
    updated_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create audit_retention_policies:', err.message));

// Add country_code column to users if it doesn't exist
db.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(10)
`).catch(err => console.error('[startup] Failed to add country_code column:', err.message));

// Create clients and client_allocations tables if they don't exist
db.query(`
  CREATE TABLE IF NOT EXISTS clients (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    contact_name  VARCHAR(255),
    contact_email VARCHAR(255),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_by    INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create clients:', err.message));

db.query(`
  CREATE TABLE IF NOT EXISTS client_allocations (
    id           SERIAL PRIMARY KEY,
    client_id    INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    percentage   SMALLINT NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    start_date   DATE,
    end_date     DATE,
    notes        TEXT,
    created_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, user_id)
  )
`).catch(err => console.error('[startup] Failed to create client_allocations:', err.message));

// Create notifications table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,
    title      VARCHAR(255) NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create notifications:', err.message));

db.query(`
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC)
`).catch(() => {});

// Talent pipeline tables
db.query(`
  CREATE TABLE IF NOT EXISTS talent_candidates (
    id                 SERIAL PRIMARY KEY,
    first_name         VARCHAR(100) NOT NULL,
    last_name          VARCHAR(100) NOT NULL,
    email              VARCHAR(255),
    phone              VARCHAR(50),
    linkedin_url       VARCHAR(500),
    stage              VARCHAR(30) NOT NULL DEFAULT 'sourced',
    employment_type    VARCHAR(20),
    job_role_id        INTEGER REFERENCES job_roles(id) ON DELETE SET NULL,
    job_role_text      VARCHAR(255),
    availability_date  DATE,
    cv_path            VARCHAR(500),
    cv_filename        VARCHAR(255),
    verified           BOOLEAN NOT NULL DEFAULT FALSE,
    verification_notes TEXT,
    interview_date     TIMESTAMPTZ,
    interview_panel    TEXT,
    interview_score    SMALLINT CHECK (interview_score BETWEEN 1 AND 5),
    interview_feedback TEXT,
    notes              TEXT,
    created_by         INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_to        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create talent_candidates:', err.message));

// Add grade column to client_allocations (A/B/C seniority grade)
db.query(`
  ALTER TABLE client_allocations ADD COLUMN IF NOT EXISTS grade CHAR(1) CHECK (grade IN ('A','B','C'))
`).catch(err => console.error('[startup] Failed to add grade column:', err.message));

// Kudos / Recognition
db.query(`
  CREATE TABLE IF NOT EXISTS kudos (
    id           SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category     VARCHAR(50),
    message      TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create kudos:', err.message));

db.query(`
  CREATE TABLE IF NOT EXISTS talent_stage_history (
    id           SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES talent_candidates(id) ON DELETE CASCADE,
    from_stage   VARCHAR(30),
    to_stage     VARCHAR(30) NOT NULL,
    note         TEXT,
    changed_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create talent_stage_history:', err.message));

// Create password_reset_tokens table if it doesn't exist (safe to run on every start)
db.query(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create password_reset_tokens table:', err.message));

// Leave management tables — chained so leave_requests waits for leave_types
db.query(`
  CREATE TABLE IF NOT EXISTS leave_types (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    colour      VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).then(() => db.query(`
  CREATE TABLE IF NOT EXISTS leave_requests (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id    INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date       DATE NOT NULL,
    end_date         DATE NOT NULL,
    half_day         BOOLEAN NOT NULL DEFAULT FALSE,
    total_days       NUMERIC(4,1) NOT NULL,
    reason           TEXT,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reviewed_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at      TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)).then(() => Promise.all([
  db.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id, created_at DESC)`),
  db.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date)`),
])).catch(err => console.error('[startup] Failed to create leave tables:', err.message));

// Extend user_role ENUM with new values (safe to run every start)
db.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'resourcing'`).catch(() => {});
db.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'functional_manager'`).catch(() => {});

// Add wbs_element and client_name columns to timesheet_entries if they don't exist
db.query(`ALTER TABLE timesheet_entries ADD COLUMN IF NOT EXISTS wbs_element VARCHAR(100)`)
  .catch(err => console.error('[startup] Failed to add wbs_element column:', err.message));
db.query(`ALTER TABLE timesheet_entries ADD COLUMN IF NOT EXISTS client_name VARCHAR(150)`)
  .catch(err => console.error('[startup] Failed to add client_name column:', err.message));

// System roles + role permissions (chained so permissions table waits for roles)
db.query(`
  CREATE TABLE IF NOT EXISTS system_roles (
    name         VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    description  TEXT,
    color        VARCHAR(20) NOT NULL DEFAULT '#6B7280',
    is_system    BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).then(() => db.query(`
  INSERT INTO system_roles (name, display_name, description, color) VALUES
    ('employee',           'Employee',           'Standard employee — personal skills, timesheets and leave', '#3B82F6'),
    ('manager',            'Manager',            'Team manager with approval rights and squad management', '#8B5CF6'),
    ('functional_manager', 'Functional Manager', 'Cross-squad manager with approval access but no squad ownership', '#EC4899'),
    ('resourcing',         'Resourcing',         'Resourcing team — talent pipeline and allocation overview', '#F59E0B'),
    ('administrator',      'Administrator',      'System administrator with full access to all features and settings', '#EF4444')
  ON CONFLICT (name) DO NOTHING
`)).then(() => db.query(`
  CREATE TABLE IF NOT EXISTS role_permissions (
    role_name  VARCHAR(50) NOT NULL REFERENCES system_roles(name) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    PRIMARY KEY (role_name, permission)
  )
`)).then(() => db.query(`
  INSERT INTO role_permissions (role_name, permission) VALUES
    ('employee','page.dashboard'),('employee','page.my_skills'),('employee','page.timesheets'),
    ('employee','page.my_certifications'),('employee','page.biography'),
    ('employee','page.my_leave'),('employee','page.team_calendar'),('employee','page.kudos'),
    ('employee','page.onboarding'),('employee','page.directory'),('employee','page.org_chart'),
    ('manager','page.dashboard'),('manager','page.skill_approvals'),('manager','page.cert_approvals'),
    ('manager','page.timesheet_approvals'),('manager','page.leave_approvals'),('manager','page.squad'),
    ('manager','page.main_skills'),('manager','page.clients'),('manager','page.client_planning'),
    ('manager','page.skills_heatmap'),('manager','page.workload'),
    ('manager','page.my_leave'),('manager','page.team_calendar'),('manager','page.kudos'),
    ('manager','page.directory'),('manager','page.org_chart'),
    ('functional_manager','page.skill_approvals'),('functional_manager','page.cert_approvals'),
    ('functional_manager','page.timesheet_approvals'),('functional_manager','page.leave_approvals'),
    ('functional_manager','page.skills_heatmap'),('functional_manager','page.workload'),
    ('functional_manager','page.my_leave'),('functional_manager','page.team_calendar'),('functional_manager','page.kudos'),
    ('functional_manager','page.directory'),('functional_manager','page.org_chart'),
    ('resourcing','page.resourcing_dashboard'),('resourcing','page.resourcing'),
    ('resourcing','page.talent_pipeline'),('resourcing','page.clients'),
    ('resourcing','page.skills_heatmap'),('resourcing','page.workload'),
    ('resourcing','page.my_leave'),('resourcing','page.team_calendar'),('resourcing','page.kudos'),
    ('resourcing','page.directory'),('resourcing','page.org_chart'),
    ('administrator','page.admin_dashboard'),('administrator','page.admin_users'),
    ('administrator','page.admin_squads'),('administrator','page.admin_job_roles'),
    ('administrator','page.admin_skills'),('administrator','page.admin_all_skills'),
    ('administrator','page.admin_all_timesheets'),('administrator','page.admin_certifications'),
    ('administrator','page.client_planning'),('administrator','page.clients'),
    ('administrator','page.skills_heatmap'),('administrator','page.workload'),
    ('administrator','page.resourcing_dashboard'),('administrator','page.resourcing'),
    ('administrator','page.talent_pipeline'),('administrator','page.my_leave'),
    ('administrator','page.leave_approvals'),('administrator','page.team_calendar'),
    ('administrator','page.kudos'),('administrator','page.admin_leave_types'),
    ('administrator','page.admin_integrations'),('administrator','page.admin_news'),
    ('administrator','page.admin_config'),('administrator','page.admin_audit'),
    ('administrator','page.admin_roles'),
    ('administrator','page.admin_reports'),
    ('administrator','page.admin_onboarding'),
    ('administrator','page.directory'),
    ('administrator','page.org_chart')
  ON CONFLICT DO NOTHING
`)).catch(err => console.error('[startup] Failed to create roles/permissions tables:', err.message));

// Client roadmap items
db.query(`
  CREATE TABLE IF NOT EXISTS client_roadmap_items (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    status      VARCHAR(30) NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned','in_progress','completed','cancelled')),
    priority    VARCHAR(20) NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low','medium','high')),
    created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create client_roadmap_items:', err.message));

// Client contracts
db.query(`
  CREATE TABLE IF NOT EXISTS client_contracts (
    id              SERIAL PRIMARY KEY,
    client_id       INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    contract_number VARCHAR(100),
    type            VARCHAR(50) CHECK (type IN ('fixed_price','time_material','retainer','sla','other')),
    start_date      DATE,
    end_date        DATE,
    value           NUMERIC(15,2),
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    status          VARCHAR(30) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('draft','active','expired','terminated')),
    description     TEXT,
    notes           TEXT,
    created_by      INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[startup] Failed to create client_contracts:', err.message));

// Onboarding checklist tables
db.query(`
  CREATE TABLE IF NOT EXISTS onboarding_templates (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).then(() => db.query(`
  CREATE TABLE IF NOT EXISTS onboarding_template_tasks (
    id          SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order  SMALLINT NOT NULL DEFAULT 0
  )
`)).then(() => db.query(`
  CREATE TABLE IF NOT EXISTS employee_onboarding (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES onboarding_templates(id) ON DELETE RESTRICT,
    assigned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, template_id)
  )
`)).then(() => db.query(`
  CREATE TABLE IF NOT EXISTS employee_onboarding_progress (
    onboarding_id INTEGER NOT NULL REFERENCES employee_onboarding(id) ON DELETE CASCADE,
    task_id       INTEGER NOT NULL REFERENCES onboarding_template_tasks(id) ON DELETE CASCADE,
    completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (onboarding_id, task_id)
  )
`)).catch(err => console.error('[startup] Failed to create onboarding tables:', err.message));

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/skills', skillRoutes);
app.use('/api/v1/timesheets', timesheetRoutes);
app.use('/api/v1/squads', squadRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/job-roles', jobRoleRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/news', newsRoutes);
app.use('/api/v1/certs', certsRoutes);
app.use('/api/v1/integrations', integrationsRoutes);
app.use('/api/v1/public', publicApiRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/resourcing', resourcingRoutes);
app.use('/api/v1/talent', talentRoutes);
app.use('/api/v1/kudos', kudosRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1/roles',      rolesRoutes);
app.use('/api/v1/reports',    reportRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/org',        orgRoutes);
app.use('/api/v1/directory',  directoryRoutes);

app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
  scheduleBirthdayJob();
});
