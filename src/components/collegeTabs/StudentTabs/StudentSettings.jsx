import { useState, useEffect } from "react";
import { ChevronRight, Edit3, Lock, LogOut, ShieldCheck, User, Monitor, Bell, Eye, HelpCircle, Info, Trash2, FileText, Clock } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

function SettingsActionRow({ icon: Icon, title, description, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0077B6] active:bg-slate-100 ${
        active ? "bg-[#EAF6FB]" : "hover:bg-slate-50"
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${active ? "border-[#B9E2F0] bg-white text-[#0077B6]" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-sm font-semibold text-slate-900">{title}</strong>
          <small className="mt-0.5 block break-words text-xs leading-5 text-slate-500">{description}</small>
        </span>
      </span>
      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${active ? "text-[#0077B6]" : "text-slate-400"}`} aria-hidden="true" />
    </button>
  );
}

function AccountSnapshot({ user }) {
  const snapshot = [
    ["Username", user.username || user.name || user.first_name || "Not provided"],
    ["Cellphone number", user.contact_number || "Not provided"],
    ["Recovery email", user.recovery_email || user.email || "Not provided"],
  ];

  return (
    <div className="divide-y divide-slate-100">
      {snapshot.map(([label, value]) => (
        <div key={label} className="grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 px-4 py-3">
          <dt className="text-xs text-slate-500">{label}</dt>
          <dd className="min-w-0 break-words text-right text-xs font-semibold leading-5 text-slate-900 [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
      <div className="grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 px-4 py-3">
        <dt className="text-xs text-slate-500">Policy</dt>
        <dd className={`text-right text-xs font-semibold ${user.policy_accepted ? "text-emerald-600" : "text-amber-600"}`}>
          {user.policy_accepted ? "Accepted" : "Pending"}
        </dd>
      </div>
    </div>
  );
}

function ToggleSetting({ title, description, enabled, onChange }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        aria-pressed={enabled}
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6] focus-visible:ring-offset-2 ${
          enabled ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function AppearanceRow({ settings, onSettingsChange }) {
  const themeOptions = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  const densityOptions = [
    { value: "compact", label: "Compact" },
    { value: "normal", label: "Normal" },
    { value: "spacious", label: "Spacious" },
  ];

  const fontSizes = {
    12: "Extra Small",
    14: "Small",
    16: "Normal",
    18: "Large",
    20: "Extra Large",
  };

  const densityPaddingMap = {
    compact: "px-3 py-2",
    normal: "px-4 py-3",
    spacious: "px-5 py-4",
  };

  const densityGapMap = {
    compact: "gap-1",
    normal: "gap-2",
    spacious: "gap-3",
  };

  return (
    <div className="space-y-4 border-t border-slate-200 px-4 py-4">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Theme</h3>
        <div className="flex gap-2">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSettingsChange("theme", option.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6] ${
                settings.theme === option.value
                  ? "border-[#0077B6] bg-[#EAF6FB] text-[#0077B6]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <label htmlFor="font-size-slider" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Font Size
          </label>
          <span className="text-xs font-semibold text-slate-900">{fontSizes[settings.fontSize]}</span>
        </div>
        <input
          id="font-size-slider"
          type="range"
          min="12"
          max="20"
          step="2"
          value={settings.fontSize}
          onChange={(e) => onSettingsChange("fontSize", Number(e.target.value))}
          className="h-2 w-full accent-[#0077B6]"
        />
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>12px</span>
          <span>20px</span>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">UI Density</h3>
        <div className="flex gap-2">
          {densityOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSettingsChange("density", option.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6] ${
                settings.density === option.value
                  ? "border-[#0077B6] bg-[#EAF6FB] text-[#0077B6]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Preview</p>
        <div className={`flex ${densityGapMap[settings.density]} rounded-lg border border-slate-200 bg-white p-2`}>
          <div className={`flex-1 rounded border border-slate-100 ${densityPaddingMap[settings.density]} bg-white text-center`}>
            <p style={{ fontSize: `${settings.fontSize}px` }} className="font-semibold text-slate-900">
              Aa
            </p>
            <p style={{ fontSize: `${settings.fontSize * 0.75}px` }} className="text-slate-500">
              Sample
            </p>
          </div>
          <div className={`flex-1 rounded border border-slate-100 ${densityPaddingMap[settings.density]} bg-[#0077B6] text-center`}>
            <p style={{ fontSize: `${settings.fontSize}px` }} className="font-semibold text-white">
              Aa
            </p>
            <p style={{ fontSize: `${settings.fontSize * 0.75}px` }} className="text-blue-100">
              Sample
            </p>
          </div>
        </div>
        <p style={{ fontSize: `${settings.fontSize}px` }} className="mt-3 leading-relaxed text-slate-600">
          This is how your interface will look with current settings applied.
        </p>
      </div>
    </div>
  );
}

function StudentSettings({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const isProfileActive = location.pathname.endsWith("/profile");
  const isPasswordActive = location.pathname.endsWith("/change-password");
  const isHistoryActive = location.pathname.endsWith("/history");

  const [appearanceSettings, setAppearanceSettings] = useState(() => {
    const saved = localStorage.getItem("appearanceSettings");
    return saved
      ? JSON.parse(saved)
      : {
          theme: "light",
          fontSize: 16,
          density: "normal",
        };
  });

  const [preferencesSettings, setPreferencesSettings] = useState(() => {
    const saved = localStorage.getItem("preferencesSettings");
    return saved
      ? JSON.parse(saved)
      : {
          notificationsEnabled: true,
          emailNotifications: true,
          borrowApprovals: true,
          borrowReminders: true,
          highContrast: false,
          reducedMotion: false,
          dataCollection: false,
        };
  });

  const [showClearDataModal, setShowClearDataModal] = useState(false);

  // Apply appearance settings to document
  useEffect(() => {
    localStorage.setItem("appearanceSettings", JSON.stringify(appearanceSettings));

    const root = document.documentElement;

    // Apply theme
    if (appearanceSettings.theme === "dark") {
      root.classList.add("dark");
    } else if (appearanceSettings.theme === "light") {
      root.classList.remove("dark");
    } else if (appearanceSettings.theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }

    // Apply font size
    root.style.fontSize = `${appearanceSettings.fontSize}px`;
    document.body.style.setProperty("--base-font-size", `${appearanceSettings.fontSize}px`);

    // Apply density
    const densityClass = `density-${appearanceSettings.density}`;
    root.classList.remove("density-compact", "density-normal", "density-spacious");
    root.classList.add(densityClass);

    // Apply density-specific spacing
    const densityStyles = {
      compact: {
        "--spacing-xs": "0.25rem",
        "--spacing-sm": "0.5rem",
        "--spacing-md": "0.75rem",
        "--spacing-lg": "1rem",
      },
      normal: {
        "--spacing-xs": "0.375rem",
        "--spacing-sm": "0.75rem",
        "--spacing-md": "1rem",
        "--spacing-lg": "1.25rem",
      },
      spacious: {
        "--spacing-xs": "0.5rem",
        "--spacing-sm": "1rem",
        "--spacing-md": "1.25rem",
        "--spacing-lg": "1.5rem",
      },
    };

    Object.entries(densityStyles[appearanceSettings.density]).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply accessibility settings
    if (preferencesSettings.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    if (preferencesSettings.reducedMotion) {
      root.classList.add("reduce-motion");
      root.style.setProperty("--animation-duration", "0s");
    } else {
      root.classList.remove("reduce-motion");
      root.style.setProperty("--animation-duration", "0.3s");
    }
  }, [appearanceSettings, preferencesSettings]);

  const handleAppearanceChange = (key, value) => {
    setAppearanceSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePreferenceChange = (key, value) => {
    setPreferencesSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    localStorage.setItem("preferencesSettings", JSON.stringify({ ...preferencesSettings, [key]: value }));
  };

  const handleClearData = () => {
    localStorage.removeItem("appearanceSettings");
    localStorage.removeItem("preferencesSettings");
    localStorage.removeItem("acknowledged_statuses");
    setAppearanceSettings({
      theme: "light",
      fontSize: 16,
      density: "normal",
    });
    setPreferencesSettings({
      notificationsEnabled: true,
      emailNotifications: true,
      borrowApprovals: true,
      borrowReminders: true,
      highContrast: false,
      reducedMotion: false,
      dataCollection: false,
    });
    setShowClearDataModal(false);
  };

  return (
    <div className="animate-slide-up mx-auto w-full max-w-[380px] min-w-0 overflow-x-hidden text-sm">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-900">Settings</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">Manage your profile, security, and preferences.</p>
      </header>

      {/* Profile & Security Section */}
      <section className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_36px_-26px_rgba(15,23,42,0.32)]">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#B9E2F0] bg-[#EAF6FB] text-[#0077B6]">
            <User className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Profile and security</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">Update your account details and password.</p>
          </div>
        </div>

        <nav aria-label="Account settings" className="divide-y divide-slate-100">
          <SettingsActionRow
            icon={Edit3}
            title="Edit profile"
            description="Change your personal information and photo."
            active={isProfileActive}
            onClick={() => navigate("/studentpage/profile")}
          />
          <SettingsActionRow
            icon={Clock}
            title="Borrow history"
            description="View your borrowing history."
            active={isHistoryActive}
            onClick={() => navigate("/studentpage/history")}
          />
          <SettingsActionRow
            icon={Lock}
            title="Change password"
            description="Keep your account protected."
            active={isPasswordActive}
            onClick={() => navigate("/studentpage/change-password")}
          />
        </nav>

        <div className="border-t border-slate-200">
          <div className="flex items-center gap-3 px-4 pb-2 pt-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Saved details</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">Information from your onboarding.</p>
            </div>
          </div>
          <dl>
            <AccountSnapshot user={user} />
          </dl>
        </div>
      </section>

      {/* Appearance Section */}
      <section className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_36px_-26px_rgba(15,23,42,0.32)]">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#B9E2F0] bg-[#EAF6FB] text-[#0077B6]">
            <Monitor className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Appearance</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">Customize your interface.</p>
          </div>
        </div>
        <AppearanceRow settings={appearanceSettings} onSettingsChange={handleAppearanceChange} />
      </section>

      {/* Notifications Section */}
      <section className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_36px_-26px_rgba(15,23,42,0.32)]">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">Manage notification preferences.</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          <ToggleSetting
            title="All notifications"
            description="Receive all types of notifications."
            enabled={preferencesSettings.notificationsEnabled}
            onChange={(value) => handlePreferenceChange("notificationsEnabled", value)}
          />
          <ToggleSetting
            title="Email notifications"
            description="Get updates via email."
            enabled={preferencesSettings.emailNotifications && preferencesSettings.notificationsEnabled}
            onChange={(value) => handlePreferenceChange("emailNotifications", value)}
          />
          <ToggleSetting
            title="Borrow approvals"
            description="Notify when requests are approved."
            enabled={preferencesSettings.borrowApprovals && preferencesSettings.notificationsEnabled}
            onChange={(value) => handlePreferenceChange("borrowApprovals", value)}
          />
          <ToggleSetting
            title="Borrow reminders"
            description="Remind when books are due soon."
            enabled={preferencesSettings.borrowReminders && preferencesSettings.notificationsEnabled}
            onChange={(value) => handlePreferenceChange("borrowReminders", value)}
          />
        </div>
      </section>

      {/* Accessibility Section */}
      <section className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_36px_-26px_rgba(15,23,42,0.32)]">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-600">
            <Eye className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Accessibility</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">Optimize for comfortable viewing.</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          <ToggleSetting
            title="High contrast"
            description="Increase color contrast for better readability."
            enabled={preferencesSettings.highContrast}
            onChange={(value) => handlePreferenceChange("highContrast", value)}
          />
          <ToggleSetting
            title="Reduce motion"
            description="Minimize animations and transitions."
            enabled={preferencesSettings.reducedMotion}
            onChange={(value) => handlePreferenceChange("reducedMotion", value)}
          />
        </div>
      </section>

      {/* Privacy Section */}
      <section className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_36px_-26px_rgba(15,23,42,0.32)]">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Privacy & Data</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">Control your data and privacy settings.</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          <ToggleSetting
            title="Usage data"
            description="Help us improve by sharing anonymized usage data."
            enabled={preferencesSettings.dataCollection}
            onChange={(value) => handlePreferenceChange("dataCollection", value)}
          />
          <button
            type="button"
            onClick={() => setShowClearDataModal(true)}
            className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-red-50"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-600">Clear all settings</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">Reset to default preferences.</p>
            </div>
            <Trash2 className="h-4 w-4 shrink-0 text-red-600" />
          </button>
        </div>
      </section>

      {/* Help & About Section */}
      <section className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_36px_-26px_rgba(15,23,42,0.32)]">
        <div className="divide-y divide-slate-100">
          <button
            type="button"
            onClick={() => navigate("/studentpage/help")}
            className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600">
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900">Help & Support</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">Get help or report an issue.</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/studentpage/about")}
            className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600">
                <Info className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900">About Libralink</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">v1.2.0 • 2026</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Logout Button */}
      <button
        type="button"
        onClick={onLogout}
        className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Log out
      </button>

      {/* Clear Data Modal */}
      {showClearDataModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowClearDataModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.45)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900">Clear all settings?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">This will reset all your preferences to defaults. This action cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowClearDataModal(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearData}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentSettings;
