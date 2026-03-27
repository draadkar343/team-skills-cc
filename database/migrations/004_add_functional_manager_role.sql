-- Add functional_manager role (and resourcing if somehow missing)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'resourcing';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'functional_manager';
