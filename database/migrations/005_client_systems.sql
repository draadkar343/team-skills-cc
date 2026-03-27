-- Migration 005: Add client_systems table for version tracking
CREATE TABLE IF NOT EXISTS client_systems (
    id             SERIAL PRIMARY KEY,
    client_id      INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name           VARCHAR(255) NOT NULL,
    version        VARCHAR(100) NOT NULL,
    vendor         VARCHAR(255),
    environment    VARCHAR(50)  NOT NULL DEFAULT 'production'
                     CHECK (environment IN ('production','staging','development','uat')),
    status         VARCHAR(50)  NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','deprecated','end_of_life')),
    support_expiry DATE,
    description    TEXT,
    notes          TEXT,
    created_by     INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
