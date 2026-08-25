import { useState } from "react";
import { FiLock, FiEye, FiEyeOff, FiCheck, FiX } from "react-icons/fi";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import api from "../../../utils/api";

function LibrarianAdminChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [validation, setValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  const validatePassword = (password) => {
    setValidation({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    });
  };

  const handlePasswordChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (field === 'newPassword') {
      validatePassword(value);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] });
  };

  const isPasswordValid = () => {
    return validation.length && validation.uppercase && validation.lowercase && validation.number;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validation
    if (!formData.currentPassword) {
      setMessage({ type: 'error', text: 'Please enter your current password' });
      return;
    }

    if (!formData.newPassword) {
      setMessage({ type: 'error', text: 'Please enter a new password' });
      return;
    }

    if (!isPasswordValid()) {
      setMessage({ type: 'error', text: 'Password does not meet the requirements' });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setMessage({ type: 'error', text: 'New password must be different from current password' });
      return;
    }

    setLoading(true);

    try {
      const userId = localStorage.getItem('currentUserId');
      const response = await api.put(`/users/${userId}/password`, {
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
      });

      if (response.success || response.data) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setValidation({ length: false, uppercase: false, lowercase: false, number: false });
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to change password' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error changing password. Please check your current password and try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1">Change Password</h2>
        <p className="text-[#64748B] text-sm">Update your password to keep your account secure</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {message.text && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[#64748B]">Current Password</label>
            <div className="relative">
              <Input
                type={showPasswords.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                placeholder="Enter current password"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
              >
                {showPasswords.current ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[#64748B]">New Password</label>
            <div className="relative">
              <Input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                placeholder="Enter new password"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
              >
                {showPasswords.new ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Requirements */}
            {formData.newPassword && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-[#64748B]">Password must contain:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    {validation.length ? (
                      <FiCheck className="w-4 h-4 text-green-600" />
                    ) : (
                      <FiX className="w-4 h-4 text-red-500" />
                    )}
                    <span className={validation.length ? 'text-green-700' : 'text-red-600'}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {validation.uppercase ? (
                      <FiCheck className="w-4 h-4 text-green-600" />
                    ) : (
                      <FiX className="w-4 h-4 text-red-500" />
                    )}
                    <span className={validation.uppercase ? 'text-green-700' : 'text-red-600'}>
                      At least one uppercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {validation.lowercase ? (
                      <FiCheck className="w-4 h-4 text-green-600" />
                    ) : (
                      <FiX className="w-4 h-4 text-red-500" />
                    )}
                    <span className={validation.lowercase ? 'text-green-700' : 'text-red-600'}>
                      At least one lowercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {validation.number ? (
                      <FiCheck className="w-4 h-4 text-green-600" />
                    ) : (
                      <FiX className="w-4 h-4 text-red-500" />
                    )}
                    <span className={validation.number ? 'text-green-700' : 'text-red-600'}>
                      At least one number
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[#64748B]">Confirm New Password</label>
            <div className="relative">
              <Input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                placeholder="Confirm new password"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
              >
                {showPasswords.confirm ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
              </button>
            </div>
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="mt-2 text-xs text-red-600">Passwords do not match</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              onClick={() => {
                setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setMessage({ type: '', text: '' });
                setValidation({ length: false, uppercase: false, lowercase: false, number: false });
              }}
              className="border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !isPasswordValid() || formData.newPassword !== formData.confirmPassword}
              className="bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default LibrarianAdminChangePassword;
