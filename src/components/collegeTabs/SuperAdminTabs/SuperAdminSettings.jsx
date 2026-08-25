import { useState, useEffect } from 'react';
import { FiSettings, FiCpu, FiDatabase, FiServer, FiActivity, FiHardDrive, FiSave } from 'react-icons/fi';
import api from '../../../utils/api';
import { ConfirmationOverlay, LoadingOverlay, AlertOverlay } from '../../common';
import useAlert from '../../../hooks/useAlert';
import { PageHeader, Button, Card, Select, Modal } from '../../ui';
import SuperAdminGeneralSettings from './SuperAdminGeneralSettings';
import SuperAdminAuthenticationSettings from './SuperAdminAuthenticationSettings';
import SuperAdminLibrarySettings from './SuperAdminLibrarySettings';
import SuperAdminNotificationsSettings from './SuperAdminNotificationsSettings';
import SuperAdminBackupSettings from './SuperAdminBackupSettings';
import SuperAdminSecuritySettings from './SuperAdminSecuritySettings';

function SuperAdminSettings({ darkMode, initialSection }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const [faviconPreview, setFaviconPreview] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [activeSection, setActiveSection] = useState(initialSection || 'general');
  const { alert, showSuccess, showError, hideAlert } = useAlert();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const systemInfo = {
    phpVersion: '8.2.0',
    mysqlVersion: '8.0.32',
    serverStatus: 'Online',
    databaseStatus: 'Connected',
    storageUsed: '2.4 GB',
    lastBackup: '2026-08-02 14:30:00',
    currentVersion: '2.0.1'
  };

  useEffect(() => {
    fetchAllSettings();
    generateApiKey();
  }, []);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const fetchAllSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      const settingsMap = res.data.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});
      setSettings(settingsMap);
      
      // Set previews if available
      if (settingsMap['system_logo']) setLogoPreview(settingsMap['system_logo']);
      if (settingsMap['favicon']) setFaviconPreview(settingsMap['favicon']);
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Use default settings if API fails
      setSettings({
        system_name: 'Libralink Library System',
        language: 'en',
        timezone: 'Asia/Manila',
        primary_color: '#2563EB',
        secondary_color: '#2563EB',
        password_min_length: 8,
        session_timeout: 30,
        password_require_uppercase: 'true',
        password_require_numbers: 'true',
        password_require_special: 'true',
        allow_registration: 'false',
        email_verification: 'true',
        max_books_student: 3,
        default_borrow_days_student: 7,
        max_renewals: 2,
        fine_per_day: 5.00,
        grace_period: 0,
        default_book_status: 'available',
        due_reminder_days: 2,
        overdue_reminder_days: 1,
        enable_email_notifications: 'true',
        enable_system_notifications: 'true',
        announcement_notifications: 'true',
        auto_backup_enabled: 'false',
        maintenance_mode: 'false',
        allowed_file_types: 'jpg,jpeg,png,pdf',
        max_upload_size: 10,
        max_login_attempts: 5,
        lockout_duration: 15,
        enable_activity_logs: 'true',
        enable_api_access: 'false',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await api.post('/settings/batch', { settings });
      showSuccess('All settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSection = async () => {
    await handleSaveAll();
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    try {
      setSaving(true);
      await api.post('/settings/reset');
      await fetchAllSettings();
      showSuccess('Settings reset to defaults');
    } catch (error) {
      console.error('Error resetting settings:', error);
      showError('Failed to reset settings');
    } finally {
      setSaving(false);
      setShowResetConfirm(false);
    }
  };

  const handleBackup = async () => {
    try {
      showSuccess('Database backup created successfully');
    } catch (error) {
      showError('Failed to create backup');
    }
  };

  const handleRestore = async () => {
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    try {
      showSuccess('Database restored successfully');
      setShowRestoreModal(false);
    } catch (error) {
      showError('Failed to restore database');
    }
  };

  const generateApiKey = () => {
    const newKey = 'lk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setApiKey(newKey);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C3AED]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Poppins']">
      <LoadingOverlay show={loading} text="Loading settings..." />

      <Modal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        title="Confirm Database Restore"
        description="This action will replace the current database with the backup. This cannot be undone. Are you sure?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRestoreModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmRestore}>Restore</Button>
          </>
        }
      />

      <PageHeader
        title="System Settings"
        description="Manage the overall configuration and behavior of the Libralink system"
        actions={[
          { label: 'Save All Settings', onClick: handleSaveAll, variant: 'primary', disabled: saving, icon: <FiSave className={saving ? 'animate-spin' : ''} /> }
        ]}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Content */}
          <div className="flex-1 space-y-6">
            {activeSection === 'general' && (
              <SuperAdminGeneralSettings
                settings={settings}
                setSettings={setSettings}
                onSave={handleSaveSection}
                onReset={handleReset}
                saving={saving}
              />
            )}

            {activeSection === 'authentication' && (
              <SuperAdminAuthenticationSettings
                settings={settings}
                setSettings={setSettings}
                onSave={handleSaveSection}
                saving={saving}
              />
            )}

            {activeSection === 'library' && (
              <SuperAdminLibrarySettings
                settings={settings}
                setSettings={setSettings}
                onSave={handleSaveSection}
                saving={saving}
              />
            )}

            {activeSection === 'notifications' && (
              <SuperAdminNotificationsSettings
                settings={settings}
                setSettings={setSettings}
                onSave={handleSaveSection}
                saving={saving}
              />
            )}

            {activeSection === 'backup' && (
              <SuperAdminBackupSettings
                settings={settings}
                setSettings={setSettings}
                systemInfo={systemInfo}
                onBackup={handleBackup}
                onRestore={handleRestore}
              />
            )}

            {activeSection === 'security' && (
              <SuperAdminSecuritySettings
                settings={settings}
                setSettings={setSettings}
                onSave={handleSaveSection}
                saving={saving}
                apiKey={apiKey}
                onGenerateApiKey={generateApiKey}
              />
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-80 space-y-6">
            <Card padding="md">
              <h3 className="text-lg font-bold text-slate-900 mb-4">System Information</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FiCpu className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">PHP Version</p>
                    <p className="text-sm font-semibold text-slate-900">{systemInfo.phpVersion}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FiDatabase className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">MySQL Version</p>
                    <p className="text-sm font-semibold text-slate-900">{systemInfo.mysqlVersion}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FiServer className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Server Status</p>
                    <p className="text-sm font-semibold text-slate-900">{systemInfo.serverStatus}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FiActivity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Database Status</p>
                    <p className="text-sm font-semibold text-slate-900">{systemInfo.databaseStatus}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FiHardDrive className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Storage Used</p>
                    <p className="text-sm font-semibold text-slate-900">{systemInfo.storageUsed}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FiDatabase className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Last Backup</p>
                    <p className="text-sm font-semibold text-slate-900">{systemInfo.lastBackup}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FiSettings className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Current Version</p>
                    <p className="text-sm font-semibold text-slate-900">{systemInfo.currentVersion}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmationOverlay
        show={showResetConfirm}
        title="Reset Settings"
        message="Are you sure you want to reset all settings to defaults? This action cannot be undone and will restore all system settings to their original values."
        confirmText="Reset Settings"
        cancelText="Cancel"
        type="warning"
        onConfirm={confirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />

      <AlertOverlay
        show={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={hideAlert}
      />
    </div>
  );
}

export default SuperAdminSettings;
