-- Migration: Add middle_name and address columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address TEXT;
