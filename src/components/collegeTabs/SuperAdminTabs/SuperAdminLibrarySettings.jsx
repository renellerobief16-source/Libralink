import { FiBook, FiSave } from 'react-icons/fi';
import { Card, Input, Select, Button } from '../../ui';

function SuperAdminLibrarySettings({ settings, setSettings, onSave, saving }) {
  return (
    <Card padding="md">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 rounded-xl">
          <FiBook className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Library Settings</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Maximum Borrow Limit"
          type="number"
          value={settings['max_books_student'] || 3}
          onChange={(e) => setSettings({ ...settings, max_books_student: e.target.value })}
        />

        <Input
          label="Borrow Duration (Days)"
          type="number"
          value={settings['default_borrow_days_student'] || 7}
          onChange={(e) => setSettings({ ...settings, default_borrow_days_student: e.target.value })}
        />

        <Input
          label="Renewal Limit"
          type="number"
          value={settings['max_renewals'] || 2}
          onChange={(e) => setSettings({ ...settings, max_renewals: e.target.value })}
        />

        <Input
          label="Fine Per Day"
          type="number"
          step="0.01"
          value={settings['fine_per_day'] || 5.00}
          onChange={(e) => setSettings({ ...settings, fine_per_day: e.target.value })}
        />

        <Input
          label="Grace Period (Days)"
          type="number"
          value={settings['grace_period'] || 0}
          onChange={(e) => setSettings({ ...settings, grace_period: e.target.value })}
        />

        <Select
          label="Default Book Status"
          value={settings['default_book_status'] || 'available'}
          onChange={(e) => setSettings({ ...settings, default_book_status: e.target.value })}
          options={[
            { value: 'available', label: 'Available' },
            { value: 'unavailable', label: 'Unavailable' },
          ]}
        />
      </div>

      <Button onClick={onSave} disabled={saving} className="mt-6">
        <FiSave className={saving ? 'animate-spin' : ''} />
        {saving ? 'Saving...' : 'Save Library Settings'}
      </Button>
    </Card>
  );
}

export default SuperAdminLibrarySettings;
