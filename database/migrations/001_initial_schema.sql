-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('employee', 'manager', 'administrator');
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
-- SKILLS CATALOGUE
-- ============================================================

CREATE TABLE skill_categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE skills_catalogue (
    id          SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES skill_categories(id) ON DELETE SET NULL,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_employee_skills_user   ON employee_skills(user_id);
CREATE INDEX idx_employee_skills_status ON employee_skills(status);
CREATE INDEX idx_timesheets_user        ON timesheets(user_id);
CREATE INDEX idx_timesheets_status      ON timesheets(status);
CREATE INDEX idx_squad_members_user     ON squad_members(user_id);

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
