import { FiDatabase, FiRefreshCw, FiDownload } from 'react-icons/fi';
import { Card, Button } from '../../ui';

function SuperAdminBackupSettings({ settings, setSettings, systemInfo, onBackup, onRestore }) {
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
          <FiDatabase className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Backup & Maintenance</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-600 mb-2">Last Backup Date</p>
            <p className="text-lg font-semibold text-slate-900">{systemInfo?.lastBackup || 'N/A'}</p>
          </div>
          
          <ToggleSwitch
            enabled={settings['auto_backup_enabled'] === 'true'}
            onChange={() => setSettings({ ...settings, auto_backup_enabled: settings['auto_backup_enabled'] === 'true' ? 'false' : 'true' })}
            label="Automatic Daily Backup"
          />
          
          <ToggleSwitch
            enabled={settings['maintenance_mode'] === 'true'}
            onChange={() => setSettings({ ...settings, maintenance_mode: settings['maintenance_mode'] === 'true' ? 'false' : 'true' })}
            label="Maintenance Mode"
          />
        </div>

        <div className="space-y-3">
          <Button onClick={onBackup} className="w-full">
            <FiDatabase />
            Backup Now
          </Button>
          <Button variant="secondary" onClick={onRestore} className="w-full">
            <FiRefreshCw />
            Restore Database
          </Button>
          <Button variant="secondary" className="w-full">
            <FiDownload />
            Export Database
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default SuperAdminBackupSettings;
