const supabase = require('../config/database');
const bcrypt = require('bcryptjs');

function normalizeUserCreateData(data = {}) {
  const trimmedGender = typeof data.gender === 'string' ? data.gender.trim() : '';
  const normalizedGender = trimmedGender ? trimmedGender.toLowerCase() : 'other';

  return {
    ...data,
    school_id: data.school_id !== undefined && data.school_id !== null && data.school_id !== '' ? Number(data.school_id) : null,
    role_id: data.role_id !== undefined && data.role_id !== null && data.role_id !== '' ? Number(data.role_id) : null,
    student_number: data.student_number || null,
    employee_number: data.employee_number || null,
    firstname: data.firstname?.trim(),
    lastname: data.lastname?.trim(),
    gender: normalizedGender,
    contact_number: data.contact_number || null,
    email: data.email?.trim(),
    password: data.password,
    status: data.status || 'active',
  };
}

function normalizeUserUpdateData(data = {}) {
  const updateData = { ...data };

  if (Object.prototype.hasOwnProperty.call(updateData, 'profile_picture') && !Object.prototype.hasOwnProperty.call(updateData, 'profile_image')) {
    updateData.profile_image = updateData.profile_picture;
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'profile_image') && !updateData.profile_image) {
    delete updateData.profile_image;
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'cellphone') && !Object.prototype.hasOwnProperty.call(updateData, 'contact_number')) {
    updateData.contact_number = updateData.cellphone;
  }

  const safeFields = {
    school_id: updateData.school_id,
    role_id: updateData.role_id,
    student_number: updateData.student_number,
    employee_number: updateData.employee_number,
    firstname: updateData.firstname,
    lastname: updateData.lastname,
    gender: updateData.gender,
    contact_number: updateData.contact_number,
    email: updateData.email,
    password: updateData.password,
    position: updateData.position,
    profile_image: updateData.profile_image,
    username: updateData.username,
    recovery_email: updateData.recovery_email,
    policy_accepted: updateData.policy_accepted,
    status: updateData.status,
    is_archived: updateData.is_archived,
  };

  const sanitized = {};
  Object.entries(safeFields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

class User {
  static async create(data) {
    const normalizedData = normalizeUserCreateData(data);
    const {
      school_id,
      role_id,
      student_number,
      employee_number,
      firstname,
      lastname,
      gender,
      contact_number,
      email,
      password,
      status = 'active'
    } = normalizedData;

    if (!firstname || !lastname || !email || !password) {
      throw new Error('First name, last name, email, and password are required');
    }

    // school_id and role_id are optional for initial registration
    // They can be set later during onboarding

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      school_id,
      role_id,
      student_number,
      employee_number,
      firstname,
      lastname,
      gender: gender || 'other',
      contact_number,
      email,
      password: hashedPassword,
      status
    };

    try {
      const { data: result, error } = await supabase
        .from('users')
        .insert(userData)
        .select('user_id')
        .single();
      
      if (error) throw error;
      return result.user_id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async login(email, password) {
    try {
      console.log('=== User.login() called ===');
      console.log('Email:', email);
      
      const { data: users, error, status, statusText } = await supabase
        .from('users')
        .select(`
          *,
          schools(school_name, school_code),
          roles(role_name)
        `)
        .eq('email', email)
        .eq('status', 'active')
        .single();

      console.log('Supabase login response:');
      console.log('  Data:', users);
      console.log('  Error:', error);
      console.log('  Status:', status);
      console.log('  StatusText:', statusText);
      console.log('========================');

      if (error) {
        console.error('Supabase login error:', error);
        throw new Error(`Database login query failed: ${error.message}`);
      }

      if (!users) {
        console.log('No user found');
        return null;
      }

      const user = users;
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log('Password valid:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('Invalid password');
        return null;
      }

      // Transform data to match expected format
      const transformedUser = {
        ...user,
        school_name: user.schools?.school_name,
        school_code: user.schools?.school_code,
        role_name: user.roles?.role_name
      };
      
      delete transformedUser.password;
      delete transformedUser.schools;
      delete transformedUser.roles;
      
      console.log('Login successful for:', email);
      return transformedUser;
    } catch (error) {
      console.error('Error logging in user:', error);
      return null;
    }
  }

  static async getById(user_id, includePassword = false) {
    try {
      console.log('[USER] Getting user by ID:', user_id);
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          *,
          schools(school_name, school_code),
          roles(role_name)
        `)
        .eq('user_id', user_id)
        .single();

      if (error) {
        console.error('[USER] Supabase error:', error);
        return null;
      }

      if (!users) {
        console.log('[USER] No user found');
        return null;
      }

      const user = users;
      const transformedUser = {
        ...user,
        school_name: user.schools?.school_name,
        school_code: user.schools?.school_code,
        role_name: user.roles?.role_name
      };

      if (!includePassword) {
        delete transformedUser.password;
      }
      delete transformedUser.schools;
      delete transformedUser.roles;

      console.log('[USER] User found successfully');
      return transformedUser;
    } catch (error) {
      console.error('[USER] Error getting user by ID:', error);
      throw error;
    }
  }

  static async getAll() {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          *,
          schools(school_name, school_code),
          roles(role_name)
        `)
        .order('lastname, firstname');

      if (error) throw error;
      
      return users.map(user => {
        const transformedUser = {
          ...user,
          school_name: user.schools?.school_name,
          school_code: user.schools?.school_code,
          role_name: user.roles?.role_name
        };
        
        delete transformedUser.password;
        delete transformedUser.schools;
        delete transformedUser.roles;
        
        return transformedUser;
      });
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  static async getBySchool(school_id, role_id = null) {
    try {
      let query = supabase
        .from('users')
        .select(`
          *,
          schools(school_name),
          roles(role_name)
        `)
        .eq('school_id', school_id);

      if (role_id) {
        query = query.eq('role_id', role_id);
      }

      const { data: users, error } = await query.order('lastname, firstname');

      if (error) throw error;
      
      return users.map(user => {
        const transformedUser = {
          ...user,
          school_name: user.schools?.school_name,
          role_name: user.roles?.role_name
        };
        
        delete transformedUser.password;
        delete transformedUser.schools;
        delete transformedUser.roles;
        
        return transformedUser;
      });
    } catch (error) {
      console.error('Error getting users by school:', error);
      throw error;
    }
  }

  static async getByStudentNumber(student_number) {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          *,
          schools(school_name, school_code),
          roles(role_name)
        `)
        .eq('student_number', student_number)
        .single();

      if (error) {
        console.error('[USER] Supabase error:', error);
        return null;
      }

      if (!users) {
        console.log('[USER] No student found with student_number:', student_number);
        return null;
      }

      const user = users;
      const transformedUser = {
        ...user,
        school_name: user.schools?.school_name,
        school_code: user.schools?.school_code,
        role_name: user.roles?.role_name
      };

      delete transformedUser.password;
      delete transformedUser.schools;
      delete transformedUser.roles;

      console.log('[USER] Student found successfully');
      return transformedUser;
    } catch (error) {
      console.error('[USER] Error getting student by student number:', error);
      throw error;
    }
  }

  static async getByEmail(email) {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          *,
          schools(school_name, school_code),
          roles(role_name)
        `)
        .eq('email', email)
        .single();

      if (error) {
        console.error('[USER] Supabase error:', error);
        return null;
      }

      if (!users) {
        console.log('[USER] No user found with email:', email);
        return null;
      }

      const user = users;
      const transformedUser = {
        ...user,
        school_name: user.schools?.school_name,
        school_code: user.schools?.school_code,
        role_name: user.roles?.role_name
      };

      delete transformedUser.password;
      delete transformedUser.schools;
      delete transformedUser.roles;

      console.log('[USER] User found successfully');
      return transformedUser;
    } catch (error) {
      console.error('[USER] Error getting user by email:', error);
      throw error;
    }
  }

  static async getByRecoveryEmail(recovery_email) {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          *,
          schools(school_name, school_code),
          roles(role_name)
        `)
        .eq('recovery_email', recovery_email)
        .single();

      if (error) {
        console.error('[USER] Supabase error:', error);
        return null;
      }

      if (!users) {
        console.log('[USER] No user found with recovery_email:', recovery_email);
        return null;
      }

      const user = users;
      const transformedUser = {
        ...user,
        school_name: user.schools?.school_name,
        school_code: user.schools?.school_code,
        role_name: user.roles?.role_name
      };

      delete transformedUser.password;
      delete transformedUser.schools;
      delete transformedUser.roles;

      console.log('[USER] User found successfully by recovery_email');
      return transformedUser;
    } catch (error) {
      console.error('[USER] Error getting user by recovery_email:', error);
      throw error;
    }
  }

  static async update(user_id, data) {
    const updateData = normalizeUserUpdateData(data);
    const { password, ...otherData } = updateData;

    if (password) {
      otherData.password = await bcrypt.hash(password, 10);
    }

    const supportedColumns = new Set([
      'school_id',
      'role_id',
      'student_number',
      'employee_number',
      'firstname',
      'lastname',
      'gender',
      'contact_number',
      'email',
      'password',
      'position',
      'profile_image',
      'status',
      'is_archived',
      'username',
      'recovery_email',
      'policy_accepted',
    ]);

    try {
      const filteredData = Object.fromEntries(
        Object.entries(otherData).filter(([key]) => supportedColumns.has(key))
      );

      const { error } = await supabase
        .from('users')
        .update(filteredData)
        .eq('user_id', user_id);

      if (error) throw error;
      return true;
    } catch (error) {
      const message = error?.message || '';
      const isMissingColumnError = error?.code === '42703' || /column .* does not exist/i.test(message);

      if (isMissingColumnError) {
        const fallbackData = Object.fromEntries(
          Object.entries(otherData).filter(([key]) => ['contact_number', 'email', 'password', 'position', 'profile_image', 'status', 'is_archived'].includes(key))
        );

        if (Object.keys(fallbackData).length === 0) {
          console.warn('No supported DB fields available for update; skipping unsupported onboarding fields.');
          return false;
        }

        try {
          const { error: fallbackError } = await supabase
            .from('users')
            .update(fallbackData)
            .eq('user_id', user_id);

          if (fallbackError) throw fallbackError;
          return true;
        } catch (fallbackError) {
          console.error('Error updating user with fallback fields:', fallbackError);
          throw fallbackError;
        }
      }

      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async changePassword(user_id, currentPassword, newPassword) {
    try {
      console.log('[USER] Changing password for user:', user_id);
      
      // Get current user with password
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('password')
        .eq('user_id', user_id)
        .single();

      if (fetchError) {
        console.error('[USER] Error fetching user:', fetchError);
        return { success: false, message: 'User not found' };
      }

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('user_id', user_id);

      if (updateError) {
        console.error('[USER] Error updating password:', updateError);
        return { success: false, message: 'Failed to update password' };
      }

      console.log('[USER] Password changed successfully');
      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('[USER] Error changing password:', error);
      return { success: false, message: 'Server error' };
    }
  }

  static async delete(user_id) {
    try {
      // Check if user is an Admin
      const { data: user } = await supabase
        .from('users')
        .select('role_id')
        .eq('user_id', user_id)
        .single();

      if (user && user.role_id === 1) {
        return { success: false, message: 'Cannot delete Admin/Super Admin accounts' };
      }

      // Check if user has active borrows
      const { count: borrowCount } = await supabase
        .from('borrow_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user_id)
        .eq('status', 'active');

      if (borrowCount > 0) {
        return { success: false, message: 'Cannot delete user with active borrows' };
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', user_id);

      if (error) throw error;
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, message: 'Database error' };
    }
  }
}

User.normalizeCreateData = normalizeUserCreateData;

module.exports = User;
