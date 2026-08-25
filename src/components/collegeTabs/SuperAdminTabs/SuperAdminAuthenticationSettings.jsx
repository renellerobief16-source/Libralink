import { FiShield, FiSave } from 'react-icons/fi';
import { Card, Input, Button } from '../../ui';

function SuperAdminAuthenticationSettings({ settings, setSettings, onSave, saving }) {
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
          <FiShield className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Authentication</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Password Minimum Length"
          type="number"
          value={settings['password_min_length'] || 8}
          onChange={(e) => setSettings({ ...settings, password_min_length: e.target.value })}
        />

        <Input
          label="Session Timeout (Minutes)"
          type="number"
          value={settings['session_timeout'] || 30}
          onChange={(e) => setSettings({ ...settings, session_timeout: e.target.value })}
        />

        <div className="md:col-span-2 space-y-4">
          <ToggleSwitch
            enabled={settings['password_require_uppercase'] === 'true'}
            onChange={() => setSettings({ ...settings, password_require_uppercase: settings['password_require_uppercase'] === 'true' ? 'false' : 'true' })}
            label="Require Uppercase Letters"
          />
          <ToggleSwitch
            enabled={settings['password_require_numbers'] === 'true'}
            onChange={() => setSettings({ ...settings, password_require_numbers: settings['password_require_numbers'] === 'true' ? 'false' : 'true' })}
            label="Require Numbers"
          />
          <ToggleSwitch
            enabled={settings['password_require_special'] === 'true'}
            onChange={() => setSettings({ ...settings, password_require_special: settings['password_require_special'] === 'true' ? 'false' : 'true' })}
            label="Require Special Characters"
          />
          <ToggleSwitch
            enabled={settings['allow_registration'] === 'true'}
            onChange={() => setSettings({ ...settings, allow_registration: settings['allow_registration'] === 'true' ? 'false' : 'true' })}
            label="Allow User Registration"
          />
          <ToggleSwitch
            enabled={settings['email_verification'] === 'true'}
            onChange={() => setSettings({ ...settings, email_verification: settings['email_verification'] === 'true' ? 'false' : 'true' })}
            label="Email Verification Required"
          />
        </div>
      </div>

      <Button onClick={onSave} disabled={saving} className="mt-6">
        <FiSave className={saving ? 'animate-spin' : ''} />
        {saving ? 'Saving...' : 'Save Authentication'}
      </Button>
    </Card>
  );
}

export default SuperAdminAuthenticationSettings;
