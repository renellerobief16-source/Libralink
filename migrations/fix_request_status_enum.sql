-- Migration: Fix request_status enum to include all required values
-- This migration adds missing status values to the request_status enum

-- First, check if the enum exists and add missing values
DO $$
BEGIN
  -- Add 'released' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'released' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
  ) THEN
    ALTER TYPE request_status ADD VALUE 'released';
  END IF;

  -- Add 'returned' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'returned' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
  ) THEN
    ALTER TYPE request_status ADD VALUE 'returned';
  END IF;

  -- Add 'waiting_pickup' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'waiting_pickup' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
  ) THEN
    ALTER TYPE request_status ADD VALUE 'waiting_pickup';
  END IF;

  -- Add 'cancelled' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'cancelled' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
  ) THEN
    ALTER TYPE request_status ADD VALUE 'cancelled';
  END IF;

  -- Add 'pending' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'pending' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
  ) THEN
    ALTER TYPE request_status ADD VALUE 'pending';
  END IF;

  -- Add 'approved' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'approved' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
  ) THEN
    ALTER TYPE request_status ADD VALUE 'approved';
  END IF;

  -- Add 'rejected' if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'rejected' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
  ) THEN
    ALTER TYPE request_status ADD VALUE 'rejected';
  END IF;
END $$;
