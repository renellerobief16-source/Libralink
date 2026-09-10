import { useState, useEffect } from "react";
import { FiSettings, FiUser, FiLock, FiBell, FiDatabase, FiShield, FiBook, FiCheck, FiAlertCircle } from "react-icons/fi";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import api, { getLibraryPolicy, updateLibraryPolicy } from "../../../utils/api";

function LibrarianAdminSettings() {
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Policy & Library State
  const [libraryName, setLibraryName] = useState('');
  const [policy, setPolicy] = useState({
    max_borrow_limit: 5,
    home_borrowing_days: 7,
    inter_school_library_use_only: true,
    enable_fines: false,
    fine_amount_per_day: 5.00,
    grace_period_days: 0,
    max_fine_cap: 500.00,
  });

  // System Preferences
  const [allowRenewals, setAllowRenewals] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [maxRenewals, setMaxRenewals] = useState(2);

  useEffect(() => {
    const fetchSettings = async () => {
      const schoolId = localStorage.getItem('schoolId');
      if (!schoolId) {
        console.error('No schoolId found in localStorage');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch school info
        const schoolResponse = await api.get(`/schools/${schoolId}`);
        const schoolData = schoolResponse.data;
        setSchoolInfo(schoolData);
        setLibraryName(schoolData?.school_name || '');

        // Fetch unified library policy
        const policyRes = await getLibraryPolicy(schoolId);
        if (policyRes.data) {
          setPolicy({
            max_borrow_limit: policyRes.data.max_borrow_limit !== undefined ? Number(policyRes.data.max_borrow_limit) : 5,
            home_borrowing_days: policyRes.data.home_borrowing_days !== undefined ? Number(policyRes.data.home_borrowing_days) : 7,
            inter_school_library_use_only: policyRes.data.inter_school_library_use_only === true || policyRes.data.inter_school_library_use_only === 'true',
            enable_fines: policyRes.data.enable_fines === true || policyRes.data.enable_fines === 'true',
            fine_amount_per_day: policyRes.data.fine_amount_per_day !== undefined ? Number(policyRes.data.fine_amount_per_day) : 5.00,
            grace_period_days: policyRes.data.grace_period_days !== undefined ? Number(policyRes.data.grace_period_days) : 0,
            max_fine_cap: policyRes.data.max_fine_cap !== undefined ? Number(policyRes.data.max_fine_cap) : 500.00,
          });
        }
      } catch (error) {
        console.error('Error fetching school settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const schoolId = localStorage.getItem('schoolId');
      if (!schoolId) throw new Error('No school ID');

      // 1. Update unified policy
      const updatedPolicy = {
        max_borrow_limit: Number(policy.max_borrow_limit) || 5,
        home_borrowing_days: Number(policy.home_borrowing_days) || 7,
        inter_school_library_use_only: Boolean(policy.inter_school_library_use_only),
        enable_fines: Boolean(policy.enable_fines),
        fine_amount_per_day: Number(policy.fine_amount_per_day) || 5.00,
        grace_period_days: Number(policy.grace_period_days) || 0,
        max_fine_cap: Number(policy.max_fine_cap) || 500.00,
      };

      await updateLibraryPolicy(schoolId, {
        ...updatedPolicy,
        max_renewals: maxRenewals,
      });

      // 2. Update school profile and legacy fields for full backwards compatibility
      try {
        await api.put(`/schools/${schoolId}`, {
          school_name: libraryName,
          default_borrow_days_student: updatedPolicy.home_borrowing_days,
          max_books_student: updatedPolicy.max_borrow_limit,
          fine_per_day: updatedPolicy.fine_amount_per_day,
          max_renewals: maxRenewals,
          grace_period: updatedPolicy.grace_period_days,
        });
      } catch (schoolErr) {
        console.warn("Secondary school sync note:", schoolErr.message);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings: ' + (error.message || 'Server error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1">Library Settings & Policies</h2>
            <p className="text-[#64748B] text-sm">Configure borrowing limits, loan durations, and fine policies for your campus library</p>
          </div>
          {saveSuccess && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-xl animate-fade-in">
              <FiCheck className="w-4 h-4" />
              Settings saved successfully
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <Card>
          <div className="py-8 text-center">
            <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[#64748B]">Loading library policy settings...</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Library Identity */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center">
                <FiUser className="w-5 h-5 text-[#2563EB]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#0F172A]">Library Profile</h3>
                <p className="text-xs text-[#64748B]">Manage your institution's library identification</p>
              </div>
            </div>
            <div className="space-y-4">
              <Input
                label="Library Display Name"
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                placeholder="Enter library name"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Registered School"
                  value={schoolInfo?.school_name || ''}
                  disabled
                  placeholder="School name"
                />
                <Input
                  label="School Code"
                  value={schoolInfo?.school_code || ''}
                  disabled
                  placeholder="School code"
                />
              </div>
            </div>
          </Card>

          {/* Borrowing Policy Configuration */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center">
                <FiBook className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#0F172A]">Borrowing Policy</h3>
                <p className="text-xs text-[#64748B]">Set borrowing allowances and loan duration for students</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Max Books & Period */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Maximum Active Books Per Student
                  </label>
                  <p className="text-xs text-[#64748B] mb-3">
                    The maximum number of books a student can have borrowed at the same time.
                  </p>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={policy.max_borrow_limit}
                    onChange={(e) => setPolicy({ ...policy, max_borrow_limit: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Borrowing Period (Days)
                  </label>
                  <p className="text-xs text-[#64748B] mb-3">
                    The number of days a student may keep a borrowed book before it becomes overdue.
                  </p>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={policy.home_borrowing_days}
                    onChange={(e) => setPolicy({ ...policy, home_borrowing_days: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Inter-School Borrowing Restriction */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A] mb-0.5">Inter-School Takeout Policy</p>
                  <p className="text-xs text-[#64748B]">
                    When enabled, visiting students from partner libraries may only read books inside your library premises (In-Library Use Only).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPolicy({ ...policy, inter_school_library_use_only: !policy.inter_school_library_use_only })}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    policy.inter_school_library_use_only ? 'bg-[#2563EB]' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                    policy.inter_school_library_use_only ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </Card>

          {/* Overdue Fine Policy */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg font-bold text-amber-600">₱</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A]">Overdue Fine Policy</h3>
                  <p className="text-xs text-[#64748B]">Configure late return penalty rules and grace periods</p>
                </div>
              </div>

              {/* Enable Fines Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#0F172A]">
                  {policy.enable_fines ? 'Fines Enabled' : 'Fines Disabled'}
                </span>
                <button
                  type="button"
                  onClick={() => setPolicy({ ...policy, enable_fines: !policy.enable_fines })}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    policy.enable_fines ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                    policy.enable_fines ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>

            {policy.enable_fines ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Fine Per Overdue Day (₱)
                  </label>
                  <p className="text-xs text-[#64748B] mb-3">
                    The amount charged for each overdue day.
                  </p>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={policy.fine_amount_per_day}
                    onChange={(e) => setPolicy({ ...policy, fine_amount_per_day: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Grace Period (Days)
                  </label>
                  <p className="text-xs text-[#64748B] mb-3">
                    Buffer days after the due date before fines begin.
                  </p>
                  <input
                    type="number"
                    min="0"
                    max="14"
                    value={policy.grace_period_days}
                    onChange={(e) => setPolicy({ ...policy, grace_period_days: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Maximum Fine Cap (₱)
                  </label>
                  <p className="text-xs text-[#64748B] mb-3">
                    Ceiling penalty amount per book.
                  </p>
                  <input
                    type="number"
                    step="10"
                    min="10"
                    value={policy.max_fine_cap}
                    onChange={(e) => setPolicy({ ...policy, max_fine_cap: Math.max(10, parseFloat(e.target.value) || 10) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <FiAlertCircle className="w-5 h-5 text-slate-500 shrink-0" />
                <p className="text-xs text-[#64748B]">
                  Overdue fines are currently disabled. Students who return books past their due date will not receive monetary penalties.
                </p>
              </div>
            )}
          </Card>

          {/* System & Circulation Preferences */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-50 border border-purple-100 rounded-lg flex items-center justify-center">
                <FiSettings className="w-5 h-5 text-[#9333EA]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#0F172A]">Circulation Preferences</h3>
                <p className="text-xs text-[#64748B]">Renewals and automated reminder settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <p className="font-medium text-sm text-[#0F172A]">Allow Book Renewals</p>
                  <p className="text-xs text-[#64748B]">Allow students to request loan renewals before the due date</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowRenewals(!allowRenewals)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    allowRenewals ? 'bg-[#2563EB]' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                    allowRenewals ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <p className="font-medium text-sm text-[#0F172A]">Automated Due Reminders</p>
                  <p className="text-xs text-[#64748B]">Send notifications when loans approach their due date</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationEnabled(!notificationEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    notificationEnabled ? 'bg-[#2563EB]' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                    notificationEnabled ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </Card>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-[#2563EB] text-white hover:bg-blue-700 px-6 py-2.5 rounded-xl font-medium shadow-none"
            >
              {saving ? 'Saving Changes...' : 'Save Policy Settings'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarianAdminSettings;
