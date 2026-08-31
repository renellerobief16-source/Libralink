const supabase = require('../config/database');

class VerificationCode {
  static async create({ user_id, email, type = 'email_verification' }) {
    try {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const normalizedType = String(type || 'email_verification').trim();

      // Generate a 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration to 15 minutes from now
      const expires_at = new Date(Date.now() + 15 * 60 * 1000);

      // Delete any previous codes for this user/email/type so only the newest code remains valid
      await supabase
        .from('verification_codes')
        .delete()
        .eq('user_id', user_id)
        .eq('email', normalizedEmail)
        .eq('type', normalizedType);

      // Insert new verification code
      const { data, error } = await supabase
        .from('verification_codes')
        .insert({
          user_id,
          email: normalizedEmail,
          code,
          type: normalizedType,
          expires_at: expires_at.toISOString()
        })
        .select('id, code, expires_at')
        .single();

      if (error) throw error;

      console.log(`[VERIFICATION] Code created for ${email}: ${code}`);
      return data;
    } catch (error) {
      console.error('[VERIFICATION] Error creating code:', error);
      throw error;
    }
  }

  static async verify({ user_id, email, code, type = 'email_verification' }) {
    try {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const normalizedCode = String(code || '').trim();
      const normalizedType = String(type || 'email_verification').trim();

      if (!user_id || !normalizedCode) {
        return { success: false, message: 'Invalid verification request' };
      }

      let verification = null;
      let error = null;

      const baseQuery = supabase
        .from('verification_codes')
        .select('*')
        .eq('user_id', user_id)
        .eq('code', normalizedCode)
        .eq('type', normalizedType)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (normalizedEmail) {
        const emailResult = await baseQuery.eq('email', normalizedEmail);
        verification = emailResult.data?.[0] || null;
        error = emailResult.error;
      }

      if (!verification) {
        const fallbackResult = await supabase
          .from('verification_codes')
          .select('*')
          .eq('user_id', user_id)
          .eq('code', normalizedCode)
          .eq('type', normalizedType)
          .eq('is_used', false)
          .order('created_at', { ascending: false })
          .limit(1);

        verification = fallbackResult.data?.[0] || null;
        error = fallbackResult.error;
      }

      if (error && error.code !== 'PGRST116') {
        console.error('[VERIFICATION] Error fetching code:', error);
        return { success: false, message: 'Invalid verification code' };
      }

      if (!verification) {
        const usedCode = await supabase
          .from('verification_codes')
          .select('*')
          .eq('user_id', user_id)
          .eq('code', normalizedCode)
          .eq('type', normalizedType)
          .order('created_at', { ascending: false })
          .limit(1);

        if (usedCode.data?.[0] && usedCode.data[0].is_used) {
          return { success: false, message: 'This verification code has already been used. Please request a new one.' };
        }

        return { success: false, message: 'Invalid verification code' };
      }

      const storedEmail = String(verification.email || '').trim().toLowerCase();
      const emailMatches = !normalizedEmail || !storedEmail || storedEmail === normalizedEmail;

      if (!emailMatches) {
        console.warn('[VERIFICATION] Code matched user_id but email did not match exactly. Allowing verification for current authenticated user.', {
          user_id,
          expectedEmail: normalizedEmail,
          storedEmail,
          code: normalizedCode
        });
      }

      const now = new Date();
      const expiresAt = new Date(verification.expires_at);
      if (now > expiresAt) {
        return { success: false, message: 'Verification code has expired' };
      }

      const { error: updateError } = await supabase
        .from('verification_codes')
        .update({ is_used: true, used_at: now.toISOString() })
        .eq('id', verification.id);

      if (updateError) {
        console.error('[VERIFICATION] Error marking code as used:', updateError);
        return { success: false, message: 'Failed to verify code' };
      }

      console.log(`[VERIFICATION] Code verified for user_id=${user_id} email=${normalizedEmail || storedEmail}`);
      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      console.error('[VERIFICATION] Error verifying code:', error);
      return { success: false, message: 'Server error' };
    }
  }

  static async cleanupExpiredCodes() {
    try {
      const now = new Date();
      const { error } = await supabase
        .from('verification_codes')
        .delete()
        .lt('expires_at', now.toISOString());

      if (error) throw error;
      
      console.log('[VERIFICATION] Cleaned up expired codes');
      return { success: true };
    } catch (error) {
      console.error('[VERIFICATION] Error cleaning up codes:', error);
      return { success: false };
    }
  }
}

module.exports = VerificationCode;
