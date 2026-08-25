  -- Library Settings Table
  -- This table stores configurable settings for each school/library

  CREATE TABLE IF NOT EXISTS library_settings (
    setting_id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(school_id) ON DELETE CASCADE,
    setting_key VARCHAR(50) NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'STRING' CHECK (setting_type IN ('STRING', 'INTEGER', 'BOOLEAN', 'JSON')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, setting_key)
  );

  CREATE INDEX IF NOT EXISTS idx_library_settings_school_id ON library_settings(school_id);
  CREATE INDEX IF NOT EXISTS idx_library_settings_setting_key ON library_settings(setting_key);

  -- Insert default settings for all existing schools
  INSERT INTO library_settings (school_id, setting_key, setting_value, setting_type, description)
  SELECT 
    school_id, 
    'home_borrowing_days', 
    '3', 
    'INTEGER', 
    'Number of days allowed for home library borrowing'
  FROM schools
  ON CONFLICT (school_id, setting_key) DO NOTHING;

  -- Insert default inter-school setting (library use only)
  INSERT INTO library_settings (school_id, setting_key, setting_value, setting_type, description)
  SELECT 
    school_id, 
    'inter_school_library_use_only', 
    'true', 
    'BOOLEAN', 
    'Whether inter-school borrowing is library use only (cannot take books out)'
  FROM schools
  ON CONFLICT (school_id, setting_key) DO NOTHING;

  -- Grant permissions
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_settings TO service_role;
  GRANT USAGE, SELECT ON SEQUENCE library_settings_setting_id_seq TO service_role;

  -- Enable Row Level Security
  ALTER TABLE library_settings ENABLE ROW LEVEL SECURITY;

  -- RLS Policies for service_role (backend API access)
  CREATE POLICY "Service role can view all library settings"
    ON library_settings FOR SELECT
    TO service_role
    USING (true);

  CREATE POLICY "Service role can insert library settings"
    ON library_settings FOR INSERT
    TO service_role
    WITH CHECK (true);

  CREATE POLICY "Service role can update library settings"
    ON library_settings FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

  CREATE POLICY "Service role can delete library settings"
    ON library_settings FOR DELETE
    TO service_role
    USING (true);

  -- Add trigger for updated_at
  CREATE TRIGGER update_library_settings_updated_at
    BEFORE UPDATE ON library_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  COMMENT ON TABLE library_settings IS 'Configurable settings for each school/library';
  COMMENT ON COLUMN library_settings.setting_key IS 'Unique key for the setting (e.g., home_borrowing_days)';
  COMMENT ON COLUMN library_settings.setting_value IS 'Value of the setting (stored as text, parsed based on setting_type)';
  COMMENT ON COLUMN library_settings.setting_type IS 'Type of the setting: STRING, INTEGER, BOOLEAN, or JSON';
