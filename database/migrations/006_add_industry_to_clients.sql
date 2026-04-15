-- Migration 006: Add industry to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
