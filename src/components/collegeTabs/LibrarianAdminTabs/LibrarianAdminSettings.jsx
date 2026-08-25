import { useState, useEffect } from "react";
import { FiSettings, FiUser, FiLock, FiBell, FiDatabase, FiShield, FiBook } from "react-icons/fi";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import api from "../../../utils/api";

function LibrarianAdminSettings() {
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    libraryName: '',
    maxBorrowDays: 14,
    maxBooksPerStudent: 5,
    finePerDay: 1.00,
    maxRenewals: 2,
    gracePeriod: 0,
    defaultBookStatus: 'available',
    allowRenewals: true,
    notificationEnabled: true,
    homeBorrowingDays: 3,
    interSchoolLibraryUseOnly: true,
  });

  useEffect(() => {
    const fetchSchoolInfo = async () => {
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
        
        // Fetch library settings
        const settingsResponse = await api.get(`/library-settings/school/${schoolId}`);
        const librarySettings = settingsResponse.data || [];
        
        // Parse library settings into a map
        const settingsMap = {};
        librarySettings.forEach(setting => {
          settingsMap[setting.setting_key] = setting.setting_value;
        });

        setSettings(prev => ({
          ...prev,
          libraryName: schoolData?.school_name || '',
          maxBorrowDays: schoolData?.default_borrow_days_student || 14,
          maxBooksPerStudent: schoolData?.max_books_student || 5,
          finePerDay: schoolData?.fine_per_day || 1.00,
          maxRenewals: schoolData?.max_renewals || 2,
          gracePeriod: schoolData?.grace_period || 0,
          defaultBookStatus: schoolData?.default_book_status || 'available',
          homeBorrowingDays: parseInt(settingsMap.home_borrowing_days) || 3,
          interSchoolLibraryUseOnly: settingsMap.inter_school_library_use_only === 'true' || settingsMap.inter_school_library_use_only === true,
        }));
      } catch (error) {
        console.error('Error fetching school info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolInfo();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const schoolId = localStorage.getItem('schoolId');
      
      // Save school settings
      const schoolData = {
        school_name: settings.libraryName,
        default_borrow_days_student: settings.maxBorrowDays,
        max_books_student: settings.maxBooksPerStudent,
        fine_per_day: settings.finePerDay,
        max_renewals: settings.maxRenewals,
        grace_period: settings.gracePeriod,
        default_book_status: settings.defaultBookStatus,
      };
      
      await api.put(`/schools/${schoolId}`, schoolData);
      
      // Save library settings
      await api.put(`/library-settings/school/${schoolId}/home_borrowing_days`, {
        setting_value: settings.homeBorrowingDays
      });
      
      await api.put(`/library-settings/school/${schoolId}/inter_school_library_use_only`, {
        setting_value: settings.interSchoolLibraryUseOnly
      });
      
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1">Settings</h2>
        <p className="text-[#64748B] text-sm">Configure your library management preferences</p>
      </div>

      {loading ? (
        <Card>
          <p className="text-sm text-[#64748B]">Loading settings...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Library Information */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiUser className="w-5 h-5 text-[#2563EB]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Library Information</h3>
            </div>
            <div className="space-y-4">
              <Input
                label="Library Name"
                value={settings.libraryName}
                onChange={(e) => setSettings({...settings, libraryName: e.target.value})}
                placeholder="Enter library name"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="School Name"
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

          {/* Borrowing Rules */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FiBook className="w-5 h-5 text-[#16A34A]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Borrowing Rules</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-slate-800 mb-1">Home Library Borrowing</p>
                <p className="text-xs text-slate-600 mb-3">Configure due date for borrowing books from your own library</p>
                <Input
                  label="Home Borrowing Days"
                  type="number"
                  value={settings.homeBorrowingDays}
                  onChange={(e) => setSettings({...settings, homeBorrowingDays: parseInt(e.target.value)})}
                  placeholder="3"
                  min="1"
                  max="30"
                />
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-semibold text-slate-800 mb-1">Inter-School Borrowing</p>
                <p className="text-xs text-slate-600 mb-3">Configure rules for borrowing from partner schools</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#0F172A]">Library Use Only</p>
                    <p className="text-sm text-[#64748B]">Books from partner schools must be used within library premises</p>
                  </div>
                  <button
                    onClick={() => setSettings({...settings, interSchoolLibraryUseOnly: !settings.interSchoolLibraryUseOnly})}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.interSchoolLibraryUseOnly ? 'bg-[#2563EB]' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.interSchoolLibraryUseOnly ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <p className="text-sm font-semibold text-slate-800 mb-3">Legacy Settings</p>
              </div>
              
              <Input
                label="Maximum Borrow Days (Legacy)"
                type="number"
                value={settings.maxBorrowDays}
                onChange={(e) => setSettings({...settings, maxBorrowDays: parseInt(e.target.value)})}
                placeholder="14"
              />
              <Input
                label="Maximum Books Per Student"
                type="number"
                value={settings.maxBooksPerStudent}
                onChange={(e) => setSettings({...settings, maxBooksPerStudent: parseInt(e.target.value)})}
                placeholder="5"
              />
              <Input
                label="Renewal Limit"
                type="number"
                value={settings.maxRenewals}
                onChange={(e) => setSettings({...settings, maxRenewals: parseInt(e.target.value)})}
                placeholder="2"
              />
              <Input
                label="Fine Per Day (Overdue) - ₱"
                type="number"
                step="0.01"
                value={settings.finePerDay}
                onChange={(e) => setSettings({...settings, finePerDay: parseFloat(e.target.value)})}
                placeholder="1.00"
              />
              <Input
                label="Grace Period (Days)"
                type="number"
                value={settings.gracePeriod}
                onChange={(e) => setSettings({...settings, gracePeriod: parseInt(e.target.value)})}
                placeholder="0"
              />
              <div>
                <label className="block text-sm font-medium mb-2 text-[#64748B]">Default Book Status</label>
                <select
                  value={settings.defaultBookStatus}
                  onChange={(e) => setSettings({...settings, defaultBookStatus: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-white text-[#0F172A]"
                >
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
            </div>
          </Card>

          {/* System Preferences */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FiSettings className="w-5 h-5 text-[#9333EA]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A]">System Preferences</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
                <div>
                  <p className="font-medium text-[#0F172A]">Allow Book Renewals</p>
                  <p className="text-sm text-[#64748B]">Allow students to renew borrowed books</p>
                </div>
                <button
                  onClick={() => setSettings({...settings, allowRenewals: !settings.allowRenewals})}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.allowRenewals ? 'bg-[#2563EB]' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.allowRenewals ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
                <div>
                  <p className="font-medium text-[#0F172A]">Enable Notifications</p>
                  <p className="text-sm text-[#64748B]">Send notifications for overdue books</p>
                </div>
                <button
                  onClick={() => setSettings({...settings, notificationEnabled: !settings.notificationEnabled})}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notificationEnabled ? 'bg-[#2563EB]' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notificationEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </Card>

          {/* Security */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <FiShield className="w-5 h-5 text-[#DC2626]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Security</h3>
            </div>
            <div className="space-y-4">
              <Button className="w-full bg-[#2563EB] hover:bg-blue-700">
                Change Password
              </Button>
              <Button className="w-full border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50">
                View Audit Log
              </Button>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button className="border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50">
              Reset to Defaults
            </Button>
            <Button onClick={handleSaveSettings} disabled={saving} className="bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarianAdminSettings;
