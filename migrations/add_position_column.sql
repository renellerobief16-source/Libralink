-- Add position column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100);
