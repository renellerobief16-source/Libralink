-- Migration: Add settings table and default system settings

CREATE TABLE IF NOT EXISTS settings (
  setting_id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settings_setting_key ON settings(setting_key);

INSERT INTO settings (setting_key, setting_value, description)
VALUES
  ('system_name', 'Libralink Library System', 'The name displayed across the platform'),
  ('language', 'en', 'Default system language'),
  ('timezone', 'Asia/Manila', 'Default timezone for dates and times'),
  ('primary_color', '#2563EB', 'Primary branding color'),
  ('secondary_color', '#10B981', 'Secondary theme color'),
  ('system_logo', '', 'URL or base64 data for the system logo'),
  ('favicon', '', 'URL or base64 data for the favicon'),
  ('password_min_length', '8', 'Minimum password length'),
  ('session_timeout', '30', 'User session timeout in minutes'),
  ('password_require_uppercase', 'true', 'Require uppercase letters in passwords'),
  ('password_require_numbers', 'true', 'Require numbers in passwords'),
  ('password_require_special', 'true', 'Require special characters in passwords'),
  ('allow_registration', 'true', 'Allow users to register themselves'),
  ('email_verification', 'true', 'Require email verification on signup'),
  ('max_books_student', '3', 'Maximum number of books a student can borrow'),
  ('default_borrow_days_student', '7', 'Default borrow duration in days'),
  ('max_renewals', '2', 'Maximum number of renewals per borrow'),
  ('fine_per_day', '5.00', 'Fine amount per overdue day'),
  ('grace_period', '0', 'Grace period in days for overdue books'),
  ('default_book_status', 'available', 'Default status for new books'),
  ('due_reminder_days', '2', 'Days before due date to send reminders'),
  ('overdue_reminder_days', '1', 'Days after due date to send overdue reminders'),
  ('enable_email_notifications', 'true', 'Enable email notifications'),
  ('enable_system_notifications', 'true', 'Enable in-app system notifications'),
  ('announcement_notifications', 'true', 'Enable announcement notifications'),
  ('auto_backup_enabled', 'false', 'Enable automatic backups'),
  ('maintenance_mode', 'false', 'Enable maintenance mode'),
  ('allowed_file_types', 'jpg,jpeg,png,pdf', 'Allowed file upload types'),
  ('max_upload_size', '10', 'Maximum upload size in megabytes'),
  ('max_login_attempts', '5', 'Maximum failed login attempts before lockout'),
  ('lockout_duration', '15', 'Lockout duration in minutes after failed login attempts'),
  ('enable_activity_logs', 'true', 'Enable activity logging'),
  ('enable_api_access', 'false', 'Enable API access for external integrations')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, description = EXCLUDED.description;
