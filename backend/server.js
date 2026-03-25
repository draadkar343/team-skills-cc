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

app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
  scheduleBirthdayJob();
});
