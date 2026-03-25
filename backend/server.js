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
const errorHandler = require('./middleware/errorHandler');
const db = require('./config/db');

const app = express();

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

app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
