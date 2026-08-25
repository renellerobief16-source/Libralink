import { useState, useEffect } from "react";
import { DollarSign, Clock, Shield, Save, AlertCircle } from "lucide-react";
import api from "../../../utils/api";

function LibrarianFineSettings({ darkMode }) {
  const [policy, setPolicy] = useState({
    enable_fines: false,
    fine_amount_per_day: 5.00,
    max_fine_cap: 500.00,
    grace_period_days: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchFinePolicy();
  }, []);

  const fetchFinePolicy = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      console.error('No schoolId found in localStorage');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/library-settings/fine-policy/${schoolId}`);
      setPolicy(response.data);
    } catch (error) {
      console.error('Error fetching fine policy:', error);
      setMessage({ type: 'error', text: 'Failed to load fine policy settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      setMessage({ type: 'error', text: 'No school ID found' });
      return;
    }

    setSaving(true);
    try {
      await api.put(`/library-settings/fine-policy/${schoolId}`, policy);
      setMessage({ type: 'success', text: 'Fine policy updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating fine policy:', error);
      setMessage({ type: 'error', text: 'Failed to update fine policy' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = () => {
    setPolicy(prev => ({ ...prev, enable_fines: !prev.enable_fines }));
  };

  return (
    <div className="animate-slide-up">
      <div className={`rounded-xl shadow-sm border p-6 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172033]">Fine Policy Settings</h1>
            <p className="text-sm text-[#64748B]">Configure overdue book fines for your library</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={`rounded-xl p-8 border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className="text-center text-[#64748B]">Loading fine policy settings...</p>
        </div>
      ) : (
        <div className={`rounded-xl shadow-sm border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Enable/Disable Fines */}
          <div className={`p-5 rounded-xl mb-6 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${policy.enable_fines ? 'bg-green-100' : 'bg-gray-200'}`}>
                  <Shield className={`w-6 h-6 ${policy.enable_fines ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#172033]">Enable Fines</h3>
                  <p className="text-sm text-[#64748B]">Charge fines for overdue book returns</p>
                </div>
              </div>
              <button
                onClick={handleToggle}
                className={`relative w-14 h-8 rounded-full transition-colors ${policy.enable_fines ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${policy.enable_fines ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          </div>

          {/* Fine Amount Per Day */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#172033] mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#64748B]" />
              Fine Amount Per Day (₱)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={policy.fine_amount_per_day}
              onChange={(e) => setPolicy(prev => ({ ...prev, fine_amount_per_day: parseFloat(e.target.value) || 0 }))}
              disabled={!policy.enable_fines}
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white disabled:opacity-50' 
                  : 'bg-white border-gray-200 disabled:bg-gray-100'
              }`}
            />
            <p className="text-xs text-[#64748B] mt-1">Amount charged for each day the book is overdue</p>
          </div>

          {/* Max Fine Cap */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#172033] mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#64748B]" />
              Maximum Fine Cap (₱)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={policy.max_fine_cap}
              onChange={(e) => setPolicy(prev => ({ ...prev, max_fine_cap: parseFloat(e.target.value) || 0 }))}
              disabled={!policy.enable_fines}
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white disabled:opacity-50' 
                  : 'bg-white border-gray-200 disabled:bg-gray-100'
              }`}
            />
            <p className="text-xs text-[#64748B] mt-1">Maximum total fine that can be charged for a single book</p>
          </div>

          {/* Grace Period Days */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#172033] mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#64748B]" />
              Grace Period (Days)
            </label>
            <input
              type="number"
              min="0"
              value={policy.grace_period_days}
              onChange={(e) => setPolicy(prev => ({ ...prev, grace_period_days: parseInt(e.target.value) || 0 }))}
              disabled={!policy.enable_fines}
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white disabled:opacity-50' 
                  : 'bg-white border-gray-200 disabled:bg-gray-100'
              }`}
            />
            <p className="text-xs text-[#64748B] mt-1">Number of days after due date before fines start accruing</p>
          </div>

          {/* Info Box */}
          {!policy.enable_fines && (
            <div className={`p-4 rounded-xl mb-6 border flex items-start gap-3 ${
              darkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Fines are currently disabled</p>
                <p className="text-yellow-700">Enable fines to start charging students for overdue book returns.</p>
              </div>
            </div>
          )}

          {/* Example Calculation */}
          {policy.enable_fines && (
            <div className={`p-4 rounded-xl mb-6 border ${
              darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
            }`}>
              <h4 className="font-medium text-[#172033] mb-2">Example Calculation</h4>
              <p className="text-sm text-[#64748B]">
                If a book is 5 days overdue with a grace period of {policy.grace_period_days} day(s):
              </p>
              <p className="text-sm font-medium text-[#172033] mt-1">
                Fine = ₱{policy.fine_amount_per_day.toFixed(2)} × max(0, 5 - {policy.grace_period_days}) = ₱{(policy.fine_amount_per_day * Math.max(0, 5 - policy.grace_period_days)).toFixed(2)}
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-700 border border-green-300' 
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}>
              {message.type === 'success' ? (
                <Shield className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LibrarianFineSettings;
