import { FiLock, FiSave, FiRefreshCw } from 'react-icons/fi';
import { Card, Input, Button } from '../../ui';

function SuperAdminSecuritySettings({ settings, setSettings, onSave, saving, apiKey, onGenerateApiKey }) {
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
          <FiLock className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Security</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Allowed File Types"
          value={settings['allowed_file_types'] || 'jpg,jpeg,png,pdf'}
          onChange={(e) => setSettings({ ...settings, allowed_file_types: e.target.value })}
        />

        <Input
          label="Maximum Upload Size (MB)"
          type="number"
          value={settings['max_upload_size'] || 10}
          onChange={(e) => setSettings({ ...settings, max_upload_size: e.target.value })}
        />

        <Input
          label="Maximum Login Attempts"
          type="number"
          value={settings['max_login_attempts'] || 5}
          onChange={(e) => setSettings({ ...settings, max_login_attempts: e.target.value })}
        />

        <Input
          label="Account Lock Duration (Minutes)"
          type="number"
          value={settings['lockout_duration'] || 15}
          onChange={(e) => setSettings({ ...settings, lockout_duration: e.target.value })}
        />

        <div className="md:col-span-2 space-y-4">
          <ToggleSwitch
            enabled={settings['enable_activity_logs'] === 'true'}
            onChange={() => setSettings({ ...settings, enable_activity_logs: settings['enable_activity_logs'] === 'true' ? 'false' : 'true' })}
            label="Enable Activity Logs"
          />
          <ToggleSwitch
            enabled={settings['enable_api_access'] === 'true'}
            onChange={() => setSettings({ ...settings, enable_api_access: settings['enable_api_access'] === 'true' ? 'false' : 'true' })}
            label="Enable API Access"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="block text-sm font-medium text-slate-700">API Key</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={apiKey}
              readOnly
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono"
            />
            <Button variant="secondary" onClick={onGenerateApiKey}>
              <FiRefreshCw />
            </Button>
          </div>
        </div>
      </div>

      <Button onClick={onSave} disabled={saving} className="mt-6">
        <FiSave className={saving ? 'animate-spin' : ''} />
        {saving ? 'Saving...' : 'Save Security Settings'}
      </Button>
    </Card>
  );
}

export default SuperAdminSecuritySettings;
