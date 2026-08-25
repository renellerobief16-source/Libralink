import { FiBell, FiSave } from 'react-icons/fi';
import { Card, Input, Button } from '../../ui';

function SuperAdminNotificationsSettings({ settings, setSettings, onSave, saving }) {
  const ToggleSwitch = ({ enabled, onChange, label }) => (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-gray-700' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-6 rotate-0' : 'translate-x-0 rotate-0'}`} />
      </button>
    </div>
  );

  return (
    <Card padding="md">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 rounded-xl">
          <FiBell className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Due Date Reminder (Days Before)"
          type="number"
          value={settings['due_reminder_days'] || 2}
          onChange={(e) => setSettings({ ...settings, due_reminder_days: e.target.value })}
        />

        <Input
          label="Overdue Reminder (Days After)"
          type="number"
          value={settings['overdue_reminder_days'] || 1}
          onChange={(e) => setSettings({ ...settings, overdue_reminder_days: e.target.value })}
        />

        <div className="md:col-span-2 space-y-4">
          <ToggleSwitch
            enabled={settings['enable_email_notifications'] === 'true'}
            onChange={() => setSettings({ ...settings, enable_email_notifications: settings['enable_email_notifications'] === 'true' ? 'false' : 'true' })}
            label="Enable Email Notifications"
          />
          <ToggleSwitch
            enabled={settings['enable_system_notifications'] === 'true'}
            onChange={() => setSettings({ ...settings, enable_system_notifications: settings['enable_system_notifications'] === 'true' ? 'false' : 'true' })}
            label="Enable In-App Notifications"
          />
          <ToggleSwitch
            enabled={settings['announcement_notifications'] === 'true'}
            onChange={() => setSettings({ ...settings, announcement_notifications: settings['announcement_notifications'] === 'true' ? 'false' : 'true' })}
            label="Announcement Notifications"
          />
        </div>
      </div>

      <Button onClick={onSave} disabled={saving} className="mt-6">
        <FiSave className={saving ? 'animate-spin' : ''} />
        {saving ? 'Saving...' : 'Save Notification Settings'}
      </Button>
    </Card>
  );
}

export default SuperAdminNotificationsSettings;
