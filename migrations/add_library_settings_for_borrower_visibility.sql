-- Migration: Add Library Settings for Public Borrower Visibility
-- This migration adds settings to control whether borrower names are publicly visible

-- ============================================
-- ADD BORROWER VISIBILITY SETTING TO LIBRARY_SETTINGS
-- ============================================

DO $$
BEGIN
  -- Check if library_settings table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'library_settings') THEN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'library_settings' 
      AND column_name = 'show_public_borrower'
    ) THEN
      ALTER TABLE library_settings 
      ADD COLUMN show_public_borrower BOOLEAN DEFAULT true;
      
      COMMENT ON COLUMN library_settings.show_public_borrower IS 'Controls whether borrower names are publicly visible in the book availability display';
    END IF;
  END IF;
END $$;

-- ============================================
-- ADD GLOBAL SETTING IF LIBRARY_SETTINGS DOESN'T EXIST
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'library_settings') THEN
    -- Create a simple settings table for borrower visibility
    CREATE TABLE IF NOT EXISTS app_settings (
      id SERIAL PRIMARY KEY,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      setting_type VARCHAR(20) DEFAULT 'string',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Insert default setting for borrower visibility
    INSERT INTO app_settings (setting_key, setting_value, setting_type, description)
    VALUES ('show_public_borrower', 'true', 'boolean', 'Controls whether borrower names are publicly visible in book availability')
    ON CONFLICT (setting_key) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- CREATE FUNCTION TO CHECK BORROWER VISIBILITY
-- ============================================

CREATE OR REPLACE FUNCTION get_borrower_visibility_setting(p_school_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  visibility_setting BOOLEAN;
BEGIN
  -- Try to get from library_settings first
  BEGIN
    SELECT show_public_borrower INTO visibility_setting
    FROM library_settings
    WHERE school_id = p_school_id;
    
    IF visibility_setting IS NOT NULL THEN
      RETURN visibility_setting;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- library_settings table might not exist or other error
    NULL;
  END;
  
  -- Fall back to global app_settings
  BEGIN
    SELECT setting_value::boolean INTO visibility_setting
    FROM app_settings
    WHERE setting_key = 'show_public_borrower';
    
    IF visibility_setting IS NOT NULL THEN
      RETURN visibility_setting;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- Default to true if no setting found
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMENT ON FUNCTION get_borrower_visibility_setting IS 'Returns whether borrower names should be publicly visible for a given school';
