import { FiSettings, FiUpload, FiSave, FiRefreshCw } from 'react-icons/fi';
import { Card, Input, Select, Button } from '../../ui';

function SuperAdminGeneralSettings({ settings, setSettings, onSave, onReset, saving }) {
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, system_logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, favicon: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const ColorPicker = ({ value, onChange, label }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value || '#7C3AED'}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
        />
        <input
          type="text"
          value={value || '#7C3AED'}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm"
        />
      </div>
    </div>
  );

  const FileUpload = ({ preview, onUpload, label, accept }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={onUpload}
          className="hidden"
          id={`upload-${label}`}
        />
        <label
          htmlFor={`upload-${label}`}
          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#7C3AED] transition-colors"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="w-12 h-12 object-cover rounded" />
          ) : (
            <FiUpload className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-sm text-gray-600">{preview ? 'Change file' : 'Upload file'}</span>
        </label>
      </div>
    </div>
  );

  return (
    <Card padding="md">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 rounded-xl">
          <FiSettings className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">General Settings</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="System Name"
          value={settings['system_name'] || 'Libralink Library System'}
          onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
        />
        
        <Select
          label="Default Language"
          value={settings['language'] || 'en'}
          onChange={(e) => setSettings({ ...settings, language: e.target.value })}
          options={[
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
          ]}
        />

        <Select
          label="Timezone"
          value={settings['timezone'] || 'Asia/Manila'}
          onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
          options={[
            { value: 'Asia/Manila', label: 'Asia/Manila' },
            { value: 'America/New_York', label: 'America/New_York' },
            { value: 'Europe/London', label: 'Europe/London' },
            { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
          ]}
        />

        <ColorPicker
          value={settings['primary_color'] || '#2563EB'}
          onChange={(value) => setSettings({ ...settings, primary_color: value })}
          label="Primary Theme Color"
        />

        <ColorPicker
          value={settings['secondary_color'] || '#2563EB'}
          onChange={(value) => setSettings({ ...settings, secondary_color: value })}
          label="Secondary Theme Color"
        />

        <FileUpload
          preview={settings['system_logo']}
          onUpload={handleLogoUpload}
          label="System Logo"
          accept="image/*"
        />

        <FileUpload
          preview={settings['favicon']}
          onUpload={handleFaviconUpload}
          label="Favicon"
          accept="image/*"
        />
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={onSave} disabled={saving}>
          <FiSave className={saving ? 'animate-spin' : ''} />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="secondary" onClick={onReset}>
          <FiRefreshCw />
          Reset
        </Button>
      </div>
    </Card>
  );
}

export default SuperAdminGeneralSettings;
