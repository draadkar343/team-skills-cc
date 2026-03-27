-- Add A/B/C grade to client_allocations table
ALTER TABLE client_allocations ADD COLUMN IF NOT EXISTS grade CHAR(1) CHECK (grade IN ('A', 'B', 'C'));
