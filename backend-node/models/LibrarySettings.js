const supabase = require('../config/database');

class LibrarySettings {
  static async getSetting(school_id, setting_key) {
    try {
      const { data, error } = await supabase
        .from('library_settings')
        .select('*')
        .eq('school_id', school_id)
        .eq('setting_key', setting_key)
        .single();

      if (error) {
        // If setting doesn't exist, return default
        if (error.code === 'PGRST116') {
          return this.getDefaultValue(setting_key);
        }
        throw error;
      }

      // Parse value based on type
      return this.parseValue(data);
    } catch (error) {
      console.error('[LIBRARY SETTINGS] Error getting setting:', error);
      throw error;
    }
  }

  static async getAllSettings(school_id) {
    try {
      const { data, error } = await supabase
        .from('library_settings')
        .select('*')
        .eq('school_id', school_id);

      if (error) throw error;

      // Parse all values
      return data.map(setting => this.parseValue(setting));
    } catch (error) {
      console.error('[LIBRARY SETTINGS] Error getting all settings:', error);
      throw error;
    }
  }

  static async updateSetting(school_id, setting_key, setting_value) {
    try {
      console.log('[LIBRARY SETTINGS] Updating setting:', school_id, setting_key, setting_value);

      // Get current setting to determine type
      const { data: currentSetting } = await supabase
        .from('library_settings')
        .select('setting_type')
        .eq('school_id', school_id)
        .eq('setting_key', setting_key)
        .single();

      let parsedValue = setting_value;
      if (currentSetting) {
        parsedValue = this.stringifyValue(setting_value, currentSetting.setting_type);
      } else {
        // Default to string if setting doesn't exist
        parsedValue = String(setting_value);
      }

      const { data, error } = await supabase
        .from('library_settings')
        .upsert({
          school_id,
          setting_key,
          setting_value: parsedValue,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[LIBRARY SETTINGS] Setting updated successfully');
      return this.parseValue(data);
    } catch (error) {
      console.error('[LIBRARY SETTINGS] Error updating setting:', error);
      throw error;
    }
  }

  static async getHomeBorrowingDays(school_id) {
    try {
      const setting = await this.getSetting(school_id, 'home_borrowing_days');
      return parseInt(setting.setting_value) || 3; // Default to 3 days
    } catch (error) {
      console.error('[LIBRARY SETTINGS] Error getting home borrowing days:', error);
      return 3; // Default fallback
    }
  }

  static parseValue(setting) {
    try {
      switch (setting.setting_type) {
        case 'INTEGER':
          return { ...setting, setting_value: parseInt(setting.setting_value) };
        case 'BOOLEAN':
          return { ...setting, setting_value: setting.setting_value === 'true' };
        case 'JSON':
          return { ...setting, setting_value: JSON.parse(setting.setting_value) };
        default:
          return setting;
      }
    } catch (error) {
      console.error('[LIBRARY SETTINGS] Error parsing value:', error);
      return setting;
    }
  }

  static stringifyValue(value, type) {
    switch (type) {
      case 'INTEGER':
        return String(parseInt(value));
      case 'BOOLEAN':
        return String(Boolean(value));
      case 'JSON':
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }

  static getDefaultValue(setting_key) {
    const defaults = {
      'home_borrowing_days': { setting_value: '3', setting_type: 'INTEGER' },
      'inter_school_library_use_only': { setting_value: 'true', setting_type: 'BOOLEAN' },
      'enable_fines': { setting_value: 'false', setting_type: 'BOOLEAN' },
      'fine_amount_per_day': { setting_value: '5.00', setting_type: 'DECIMAL' },
      'max_fine_cap': { setting_value: '500.00', setting_type: 'DECIMAL' },
      'grace_period_days': { setting_value: '0', setting_type: 'INTEGER' }
    };
    return defaults[setting_key] || { setting_value: '', setting_type: 'STRING' };
  }

  static async getFinePolicy(school_id) {
    try {
      const enableFines = await this.getSetting(school_id, 'enable_fines');
      const fineAmountPerDay = await this.getSetting(school_id, 'fine_amount_per_day');
      const maxFineCap = await this.getSetting(school_id, 'max_fine_cap');
      const gracePeriodDays = await this.getSetting(school_id, 'grace_period_days');

      return {
        enable_fines: enableFines.setting_value === true || enableFines.setting_value === 'true',
        fine_amount_per_day: parseFloat(fineAmountPerDay.setting_value) || 5.00,
        max_fine_cap: parseFloat(maxFineCap.setting_value) || 500.00,
        grace_period_days: parseInt(gracePeriodDays.setting_value) || 0
      };
    } catch (error) {
      console.error('[LIBRARY SETTINGS] Error getting fine policy:', error);
      return {
        enable_fines: false,
        fine_amount_per_day: 5.00,
        max_fine_cap: 500.00,
        grace_period_days: 0
      };
    }
  }

  static async updateFinePolicy(school_id, policy) {
    try {
      await this.updateSetting(school_id, 'enable_fines', policy.enable_fines);
      await this.updateSetting(school_id, 'fine_amount_per_day', policy.fine_amount_per_day);
      await this.updateSetting(school_id, 'max_fine_cap', policy.max_fine_cap);
      await this.updateSetting(school_id, 'grace_period_days', policy.grace_period_days);
      return await this.getFinePolicy(school_id);
    } catch (error) {
      console.error('[LIBRARY SETTINGS] Error updating fine policy:', error);
      throw error;
    }
  }
}

module.exports = LibrarySettings;
