-- Add fine policy settings to library_settings table
-- These settings control whether fines are charged for overdue books and the fine amount per day

INSERT INTO library_settings (school_id, setting_key, setting_value, setting_type, description)
SELECT 
  school_id,
  'enable_fines',
  'false',
  'BOOLEAN',
  'Enable or disable fines for overdue books'
FROM schools
ON CONFLICT (school_id, setting_key) DO NOTHING;

INSERT INTO library_settings (school_id, setting_key, setting_value, setting_type, description)
SELECT 
  school_id,
  'fine_amount_per_day',
  '5.00',
  'STRING',
  'Fine amount charged per overdue day (in PHP)'
FROM schools
ON CONFLICT (school_id, setting_key) DO NOTHING;

INSERT INTO library_settings (school_id, setting_key, setting_value, setting_type, description)
SELECT 
  school_id,
  'max_fine_cap',
  '500.00',
  'STRING',
  'Maximum fine amount that can be charged (in PHP)'
FROM schools
ON CONFLICT (school_id, setting_key) DO NOTHING;

INSERT INTO library_settings (school_id, setting_key, setting_value, setting_type, description)
SELECT 
  school_id,
  'grace_period_days',
  '0',
  'INTEGER',
  'Grace period in days before fines start accruing'
FROM schools
ON CONFLICT (school_id, setting_key) DO NOTHING;
