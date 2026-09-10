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
        }, { onConflict: 'school_id,setting_key' })
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

  static async getMaxBorrowLimit(school_id) {
    try {
      const setting = await this.getSetting(school_id, 'max_borrow_limit');
      return parseInt(setting.setting_value) || 5; // Default to 5 books
    } catch (error) {
      console.error('[LIBRARY SETTINGS] Error getting max borrow limit:', error);
      return 5; // Default fallback
    }
  }

  static parseValue(setting) {
    try {
      switch (setting.setting_type) {
        case 'INTEGER':
          return { ...setting, setting_value: parseInt(setting.setting_value) };
        case 'BOOLEAN':
          return { ...setting, setting_value: setting.setting_value === 'true' || setting.setting_value === true };
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
      'max_borrow_limit': { setting_value: '5', setting_type: 'INTEGER' },
      'home_borrowing_days': { setting_value: '3', setting_type: 'INTEGER' },
      'inter_school_library_use_only': { setting_value: 'true', setting_type: 'BOOLEAN' },
      'enable_fines': { setting_value: 'false', setting_type: 'BOOLEAN' },
      'fine_amount_per_day': { setting_value: '5.00', setting_type: 'DECIMAL' },
      'max_fine_cap': { setting_value: '500.00', setting_type: 'DECIMAL' },
      'grace_period_days': { setting_value: '0', setting_type: 'INTEGER' },
      'enable_visiting_fee': { setting_value: 'false', setting_type: 'BOOLEAN' },
      'visiting_fee_amount': { setting_value: '0.00', setting_type: 'DECIMAL' },
      'visiting_fee_type': { setting_value: 'per_visit', setting_type: 'STRING' },
      'visiting_policy_notes': { setting_value: 'Visiting students from other consortium schools may review, read, and research this book on-site inside library premises.', setting_type: 'STRING' }
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

  static async getBorrowingPolicy(school_id) {
    try {
      const [
        limitSetting,
        daysSetting,
        interSetting,
        visitingFeeSetting,
        visitingAmountSetting,
        visitingTypeSetting,
        visitingNotesSetting,
        finePolicy
      ] = await Promise.all([
        this.getSetting(school_id, 'max_borrow_limit'),
        this.getSetting(school_id, 'home_borrowing_days'),
        this.getSetting(school_id, 'inter_school_library_use_only'),
        this.getSetting(school_id, 'enable_visiting_fee'),
        this.getSetting(school_id, 'visiting_fee_amount'),
        this.getSetting(school_id, 'visiting_fee_type'),
        this.getSetting(school_id, 'visiting_policy_notes'),
        this.getFinePolicy(school_id),
      ]);

      return {
        school_id: parseInt(school_id),
        max_borrow_limit: parseInt(limitSetting.setting_value) || 5,
        home_borrowing_days: parseInt(daysSetting.setting_value) || 3,
        inter_school_library_use_only: interSetting.setting_value === true || interSetting.setting_value === 'true',
        enable_visiting_fee: visitingFeeSetting.setting_value === true || visitingFeeSetting.setting_value === 'true',
        visiting_fee_amount: parseFloat(visitingAmountSetting.setting_value) || 0.00,
        visiting_fee_type: String(visitingTypeSetting.setting_value || 'per_visit'),
        visiting_policy_notes: String(visitingNotesSetting.setting_value || 'Visiting students from other consortium schools may review, read, and research this book on-site inside library premises.'),
        ...finePolicy
      };
    } catch (error) {
      console.error('[LIBRARY SETTINGS] Error getting borrowing policy:', error);
      return {
        school_id: parseInt(school_id),
        max_borrow_limit: 5,
        home_borrowing_days: 3,
        inter_school_library_use_only: true,
        enable_visiting_fee: false,
        visiting_fee_amount: 0.00,
        visiting_fee_type: 'per_visit',
        visiting_policy_notes: 'Visiting students from other consortium schools may review, read, and research this book on-site inside library premises.',
        enable_fines: false,
        fine_amount_per_day: 5.00,
        max_fine_cap: 500.00,
        grace_period_days: 0
      };
    }
  }

  static async updateBorrowingPolicy(school_id, policy) {
    try {
      if (policy.max_borrow_limit !== undefined) {
        await this.updateSetting(school_id, 'max_borrow_limit', policy.max_borrow_limit);
      }
      if (policy.home_borrowing_days !== undefined) {
        await this.updateSetting(school_id, 'home_borrowing_days', policy.home_borrowing_days);
      }
      if (policy.inter_school_library_use_only !== undefined) {
        await this.updateSetting(school_id, 'inter_school_library_use_only', policy.inter_school_library_use_only);
      }
      if (policy.enable_visiting_fee !== undefined) {
        await this.updateSetting(school_id, 'enable_visiting_fee', policy.enable_visiting_fee);
      }
      if (policy.visiting_fee_amount !== undefined) {
        await this.updateSetting(school_id, 'visiting_fee_amount', policy.visiting_fee_amount);
      }
      if (policy.visiting_fee_type !== undefined) {
        await this.updateSetting(school_id, 'visiting_fee_type', policy.visiting_fee_type);
      }
      if (policy.visiting_policy_notes !== undefined) {
        await this.updateSetting(school_id, 'visiting_policy_notes', policy.visiting_policy_notes);
      }
      if (policy.enable_fines !== undefined || policy.fine_amount_per_day !== undefined || policy.max_fine_cap !== undefined || policy.grace_period_days !== undefined) {
        await this.updateFinePolicy(school_id, {
          enable_fines: policy.enable_fines !== undefined ? policy.enable_fines : false,
          fine_amount_per_day: policy.fine_amount_per_day !== undefined ? policy.fine_amount_per_day : 5.00,
          max_fine_cap: policy.max_fine_cap !== undefined ? policy.max_fine_cap : 500.00,
          grace_period_days: policy.grace_period_days !== undefined ? policy.grace_period_days : 0
        });
      }

      // Keep schools table in sync for legacy compatibility
      try {
        const schoolUpdates = {};
        if (policy.home_borrowing_days !== undefined) schoolUpdates.default_borrow_days_student = policy.home_borrowing_days;
        if (policy.max_borrow_limit !== undefined) schoolUpdates.max_books_student = policy.max_borrow_limit;
        if (policy.fine_amount_per_day !== undefined) schoolUpdates.fine_per_day = policy.fine_amount_per_day;
        if (policy.grace_period_days !== undefined) schoolUpdates.grace_period = policy.grace_period_days;
        if (policy.max_renewals !== undefined) schoolUpdates.max_renewals = policy.max_renewals;

        if (Object.keys(schoolUpdates).length > 0) {
          await supabase.from('schools').update(schoolUpdates).eq('school_id', school_id);
        }
      } catch (schoolSyncErr) {
        console.warn('[LIBRARY SETTINGS] Could not sync schools table:', schoolSyncErr.message);
      }

      return await this.getBorrowingPolicy(school_id);
    } catch (error) {
      console.error('[LIBRARY SETTINGS] Error updating borrowing policy:', error);
      throw error;
    }
  }
}

module.exports = LibrarySettings;
