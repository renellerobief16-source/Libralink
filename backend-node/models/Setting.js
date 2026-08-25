const { Client } = require('pg');
const supabase = require('../config/database');

const DEFAULT_SETTINGS = [
  { setting_key: 'system_name', setting_value: 'Libralink Library System', description: 'The name displayed across the platform' },
  { setting_key: 'language', setting_value: 'en', description: 'Default system language' },
  { setting_key: 'timezone', setting_value: 'Asia/Manila', description: 'Default timezone for dates and times' },
  { setting_key: 'primary_color', setting_value: '#2563EB', description: 'Primary branding color' },
  { setting_key: 'secondary_color', setting_value: '#10B981', description: 'Secondary theme color' },
  { setting_key: 'system_logo', setting_value: '', description: 'URL or base64 data for the system logo' },
  { setting_key: 'favicon', setting_value: '', description: 'URL or base64 data for the favicon' },
  { setting_key: 'password_min_length', setting_value: '8', description: 'Minimum password length' },
  { setting_key: 'session_timeout', setting_value: '30', description: 'User session timeout in minutes' },
  { setting_key: 'password_require_uppercase', setting_value: 'true', description: 'Require uppercase letters in passwords' },
  { setting_key: 'password_require_numbers', setting_value: 'true', description: 'Require numbers in passwords' },
  { setting_key: 'password_require_special', setting_value: 'true', description: 'Require special characters in passwords' },
  { setting_key: 'allow_registration', setting_value: 'true', description: 'Allow users to register themselves' },
  { setting_key: 'email_verification', setting_value: 'true', description: 'Require email verification on signup' },
  { setting_key: 'max_books_student', setting_value: '3', description: 'Maximum number of books a student can borrow' },
  { setting_key: 'default_borrow_days_student', setting_value: '7', description: 'Default borrow duration in days' },
  { setting_key: 'max_renewals', setting_value: '2', description: 'Maximum number of renewals per borrow' },
  { setting_key: 'fine_per_day', setting_value: '5.00', description: 'Fine amount per overdue day' },
  { setting_key: 'grace_period', setting_value: '0', description: 'Grace period in days for overdue books' },
  { setting_key: 'default_book_status', setting_value: 'available', description: 'Default status for new books' },
  { setting_key: 'due_reminder_days', setting_value: '2', description: 'Days before due date to send reminders' },
  { setting_key: 'overdue_reminder_days', setting_value: '1', description: 'Days after due date to send overdue reminders' },
  { setting_key: 'enable_email_notifications', setting_value: 'true', description: 'Enable email notifications' },
  { setting_key: 'enable_system_notifications', setting_value: 'true', description: 'Enable in-app system notifications' },
  { setting_key: 'announcement_notifications', setting_value: 'true', description: 'Enable announcement notifications' },
  { setting_key: 'auto_backup_enabled', setting_value: 'false', description: 'Enable automatic backups' },
  { setting_key: 'maintenance_mode', setting_value: 'false', description: 'Enable maintenance mode' },
  { setting_key: 'allowed_file_types', setting_value: 'jpg,jpeg,png,pdf', description: 'Allowed file upload types' },
  { setting_key: 'max_upload_size', setting_value: '10', description: 'Maximum upload size in megabytes' },
  { setting_key: 'max_login_attempts', setting_value: '5', description: 'Maximum failed login attempts before lockout' },
  { setting_key: 'lockout_duration', setting_value: '15', description: 'Lockout duration in minutes after failed login attempts' },
  { setting_key: 'enable_activity_logs', setting_value: 'true', description: 'Enable activity logging' },
  { setting_key: 'enable_api_access', setting_value: 'false', description: 'Enable API access for external integrations' },
];

const SETTINGS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.settings (
  setting_id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_settings_setting_key ON public.settings(setting_key);
`;

async function ensureSettingsTable() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(SETTINGS_TABLE_SQL);
  } finally {
    await client.end();
  }
}

class Setting {
  static async getAll() {
    try {
      const { data, error } = await supabase.from('settings').select('*').order('setting_key', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        await ensureSettingsTable();
        const { data: retryData, error: retryError } = await supabase.from('settings').select('*').order('setting_key', { ascending: true });
        if (retryError) throw retryError;
        return retryData || [];
      }
      throw error;
    }
  }

  static async upsertMany(settings) {
    if (!settings || Object.keys(settings).length === 0) {
      return [];
    }

    const rows = Array.isArray(settings)
      ? settings.map((setting) => ({ setting_key: setting.setting_key, setting_value: String(setting.setting_value) }))
      : Object.entries(settings).map(([setting_key, setting_value]) => ({ setting_key, setting_value: String(setting_value) }));

    try {
      const { data, error } = await supabase.from('settings').upsert(rows, { onConflict: 'setting_key' }).select();
      if (error) throw error;
      return data || [];
    } catch (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        await ensureSettingsTable();
        return Setting.upsertMany(settings);
      }
      throw error;
    }
  }

  static async resetDefaults() {
    try {
      await ensureSettingsTable();
      const { data, error } = await supabase.from('settings').upsert(DEFAULT_SETTINGS, { onConflict: 'setting_key' }).select();
      if (error) throw error;
      return data || [];
    } catch (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        await ensureSettingsTable();
        return Setting.resetDefaults();
      }
      throw error;
    }
  }

  static getDefaults() {
    return DEFAULT_SETTINGS;
  }
}

module.exports = Setting;
