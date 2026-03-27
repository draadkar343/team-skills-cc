-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('employee', 'manager', 'administrator', 'resourcing', 'functional_manager');
CREATE TYPE workflow_status AS ENUM ('draft', 'pending', 'approved', 'rejected');

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    role          user_role NOT NULL DEFAULT 'employee',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url    VARCHAR(500),
    biography     TEXT,
    date_of_birth DATE,
    job_role_id   INTEGER,                          -- FK added after job_roles table created
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SQUADS
-- ============================================================

CREATE TABLE squads (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    manager_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE squad_members (
    squad_id    INTEGER NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (squad_id, user_id),
    UNIQUE (user_id)  -- each employee belongs to exactly one squad
);

-- ============================================================
-- JOB ROLES & MAIN SKILLS
-- ============================================================

CREATE TABLE job_roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE main_skills (
    id          SERIAL PRIMARY KEY,
    job_role_id INTEGER NOT NULL REFERENCES job_roles(id) ON DELETE RESTRICT,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (job_role_id, name)
);

-- Now that job_roles exists, add the FK on users
ALTER TABLE users ADD CONSTRAINT fk_users_job_role
    FOREIGN KEY (job_role_id) REFERENCES job_roles(id) ON DELETE SET NULL;

-- ============================================================
-- SKILLS CATALOGUE
-- ============================================================

CREATE TABLE skill_categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE skills_catalogue (
    id           SERIAL PRIMARY KEY,
    category_id  INTEGER REFERENCES skill_categories(id) ON DELETE SET NULL,
    main_skill_id INTEGER REFERENCES main_skills(id) ON DELETE SET NULL,
    name         VARCHAR(150) NOT NULL,
    description  TEXT,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EMPLOYEE SKILLS
-- ============================================================

CREATE TABLE employee_skills (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id         INTEGER NOT NULL REFERENCES skills_catalogue(id) ON DELETE RESTRICT,
    weighting        SMALLINT NOT NULL CHECK (weighting >= 0 AND weighting <= 100),
    notes            TEXT,
    status           workflow_status NOT NULL DEFAULT 'draft',
    submitted_at     TIMESTAMPTZ,
    reviewed_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at      TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, skill_id)
);

CREATE TABLE skill_workflow_history (
    id                SERIAL PRIMARY KEY,
    employee_skill_id INTEGER NOT NULL REFERENCES employee_skills(id) ON DELETE CASCADE,
    changed_by        INTEGER NOT NULL REFERENCES users(id),
    from_status       workflow_status,
    to_status         workflow_status NOT NULL,
    comment           TEXT,
    changed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TIMESHEETS
-- ============================================================

CREATE TABLE timesheets (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start_date  DATE NOT NULL,
    total_hours      NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (total_hours >= 0 AND total_hours <= 168),
    notes            TEXT,
    status           workflow_status NOT NULL DEFAULT 'draft',
    submitted_at     TIMESTAMPTZ,
    reviewed_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at      TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, week_start_date)
);

CREATE TABLE timesheet_entries (
    id           SERIAL PRIMARY KEY,
    timesheet_id INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
    work_date    DATE NOT NULL,
    hours        NUMERIC(4,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
    project_code VARCHAR(100),
    description  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SYSTEM CONFIGURATION
-- ============================================================

CREATE TABLE system_config (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT,
    description VARCHAR(255),
    updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_config (key, value, description) VALUES
    ('company_name',        'My Company',  'Displayed in header'),
    ('company_logo',        NULL,          'Path to uploaded logo file'),
    ('primary_color',       '#3B82F6',     'Brand hex color'),
    ('allow_self_register', 'false',       'Employees can self-register');

INSERT INTO system_config (key, value, description) VALUES (
  'resume_template',
  $tpl$<div style="font-family: Arial, sans-serif; padding: 40px; background: white; color: #333; max-width: 794px;">
  <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 3px solid #3B82F6;">
    {{profilePicture}}
    <div>
      <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #111827;">{{fullName}}</h1>
      <p style="margin: 6px 0 0; font-size: 15px; color: #6B7280;">{{jobRole}}</p>
    </div>
  </div>
  <div style="margin-bottom: 28px;">
    <h2 style="font-size: 14px; font-weight: 700; color: #3B82F6; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Professional Summary</h2>
    <p style="font-size: 13px; line-height: 1.7; margin: 0; white-space: pre-wrap;">{{biography}}</p>
  </div>
  <div>
    <h2 style="font-size: 14px; font-weight: 700; color: #3B82F6; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Skills</h2>
    {{skills}}
  </div>
</div>$tpl$,
  'HTML template for employee resume PDF. Placeholders: {{fullName}}, {{firstName}}, {{lastName}}, {{jobRole}}, {{biography}}, {{profilePicture}}, {{skills}}'
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    table_name  VARCHAR(100) NOT NULL,
    operation   VARCHAR(10)  NOT NULL,   -- INSERT | UPDATE | DELETE
    row_id      INTEGER,                 -- PK of the affected row (NULL for tables without integer PK)
    old_data    JSONB,                   -- NULL for INSERT
    new_data    JSONB,                   -- NULL for DELETE
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_table   ON audit_log(table_name);
CREATE INDEX idx_audit_log_changed ON audit_log(changed_at DESC);
CREATE INDEX idx_audit_log_row     ON audit_log(table_name, row_id);

-- Generic trigger function: captures row data, strips password_hash
CREATE OR REPLACE FUNCTION fn_audit_trigger() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, operation, row_id, old_data)
    VALUES (TG_TABLE_NAME, TG_OP,
            (to_jsonb(OLD)->>'id')::integer,
            to_jsonb(OLD) - 'password_hash');
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, operation, row_id, new_data)
    VALUES (TG_TABLE_NAME, TG_OP,
            (to_jsonb(NEW)->>'id')::integer,
            to_jsonb(NEW) - 'password_hash');
  ELSE
    INSERT INTO audit_log (table_name, operation, row_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, TG_OP,
            (to_jsonb(NEW)->>'id')::integer,
            to_jsonb(OLD) - 'password_hash',
            to_jsonb(NEW) - 'password_hash');
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all business tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'squads', 'squad_members',
    'job_roles', 'main_skills',
    'skill_categories', 'skills_catalogue',
    'employee_skills', 'skill_workflow_history',
    'timesheets', 'timesheet_entries',
    'system_config'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%1$s
       AFTER INSERT OR UPDATE OR DELETE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger()',
      t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_employee_skills_user   ON employee_skills(user_id);
CREATE INDEX idx_employee_skills_status ON employee_skills(status);
CREATE INDEX idx_timesheets_user        ON timesheets(user_id);
CREATE INDEX idx_timesheets_status      ON timesheets(status);
CREATE INDEX idx_squad_members_user     ON squad_members(user_id);
CREATE INDEX idx_main_skills_job_role   ON main_skills(job_role_id);
CREATE INDEX idx_catalogue_main_skill   ON skills_catalogue(main_skill_id);
CREATE INDEX idx_users_job_role         ON users(job_role_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default admin user: admin@company.com / Admin1234!
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
    ('admin@company.com', '$2b$10$GTfF6uU8HjFnDnRS.vBJ3uTJlTxwsqNG/tqKGl08l4gW1.dR8D0Ym', 'System', 'Admin', 'administrator');

-- Skill categories
INSERT INTO skill_categories (name) VALUES
    ('Technical'),
    ('Soft Skills'),
    ('Leadership'),
    ('Domain Knowledge'),
    ('Tools & Platforms');

-- Sample skills
INSERT INTO skills_catalogue (category_id, name, description) VALUES
    (1, 'JavaScript', 'Frontend and backend JavaScript development'),
    (1, 'Python', 'Python programming language'),
    (1, 'SQL', 'Relational database querying'),
    (1, 'Docker', 'Container platform'),
    (1, 'React', 'React frontend framework'),
    (2, 'Communication', 'Written and verbal communication'),
    (2, 'Problem Solving', 'Analytical thinking and problem resolution'),
    (2, 'Teamwork', 'Collaboration and team contribution'),
    (3, 'Project Management', 'Planning and delivering projects'),
    (3, 'Mentoring', 'Coaching and developing others'),
    (4, 'Agile/Scrum', 'Agile methodology'),
    (5, 'Git', 'Version control with Git'),
    (5, 'AWS', 'Amazon Web Services cloud platform'),
    (5, 'Linux', 'Linux system administration');

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================

CREATE TABLE password_reset_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EMPLOYEE CERTIFICATIONS
-- ============================================================

CREATE TABLE employee_certifications (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name             VARCHAR(150) NOT NULL,
    provider         VARCHAR(150),
    date_obtained    DATE NOT NULL,
    expiration_date  DATE,
    certificate_url  VARCHAR(500),
    notes            TEXT,
    status           workflow_status NOT NULL DEFAULT 'draft',
    submitted_at     TIMESTAMPTZ,
    reviewed_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at      TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NEWS ITEMS
-- ============================================================

CREATE TABLE news_items (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    body        TEXT NOT NULL,
    job_role_id INTEGER REFERENCES job_roles(id) ON DELETE SET NULL,
    created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT RETENTION POLICIES
-- ============================================================

CREATE TABLE audit_retention_policies (
    table_name      VARCHAR(100) PRIMARY KEY,
    retention_days  INTEGER NOT NULL,
    updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ERROR LOG
-- ============================================================

CREATE TABLE error_log (
    id          BIGSERIAL PRIMARY KEY,
    level       VARCHAR(20) NOT NULL DEFAULT 'error',
    message     TEXT NOT NULL,
    stack       TEXT,
    method      VARCHAR(10),
    path        VARCHAR(500),
    user_id     INTEGER,
    status_code INTEGER,
    context     JSONB,
    logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_error_log_logged ON error_log(logged_at DESC);

-- ============================================================
-- WEBHOOKS
-- ============================================================

CREATE TABLE webhooks (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    url         VARCHAR(500) NOT NULL,
    secret      VARCHAR(255),
    events      TEXT[] NOT NULL DEFAULT '{}',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
    id            SERIAL PRIMARY KEY,
    webhook_id    INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event         VARCHAR(100) NOT NULL,
    payload       JSONB NOT NULL,
    response_code INTEGER,
    response_body TEXT,
    success       BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

-- ============================================================
-- API KEYS
-- ============================================================

CREATE TABLE api_keys (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    description  TEXT,
    key_hash     VARCHAR(255) NOT NULL,
    key_prefix   VARCHAR(20) NOT NULL,
    scopes       TEXT[] NOT NULL DEFAULT '{}',
    created_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    last_used_at TIMESTAMPTZ,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXTERNAL INTEGRATIONS
-- ============================================================

CREATE TABLE external_integrations (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    base_url    VARCHAR(500) NOT NULL,
    auth_type   VARCHAR(50) NOT NULL DEFAULT 'none',
    auth_config JSONB NOT NULL DEFAULT '{}',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,
    title      VARCHAR(255) NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- ============================================================
-- CLIENTS & CLIENT ALLOCATIONS
-- ============================================================

CREATE TABLE clients (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    contact_name  VARCHAR(255),
    contact_email VARCHAR(255),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_by    INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE client_allocations (
    id         SERIAL PRIMARY KEY,
    client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    percentage SMALLINT NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    start_date DATE,
    end_date   DATE,
    notes      TEXT,
    grade      CHAR(1) CHECK (grade IN ('A', 'B', 'C')),
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, user_id)
);

-- ============================================================
-- KUDOS / RECOGNITION
-- ============================================================

CREATE TABLE kudos (
    id           SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category     VARCHAR(50),
    message      TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TALENT PIPELINE
-- ============================================================

CREATE TABLE talent_candidates (
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
    interview_score    SMALLINT CHECK (interview_score >= 1 AND interview_score <= 5),
    interview_feedback TEXT,
    notes              TEXT,
    created_by         INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_to        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEAVE MANAGEMENT
-- ============================================================

CREATE TABLE leave_types (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    colour      VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leave_requests (
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
);

CREATE INDEX idx_leave_requests_user ON leave_requests(user_id, created_at DESC);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
