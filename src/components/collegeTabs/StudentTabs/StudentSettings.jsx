import { useState } from "react";
import { ChevronRight, Edit3, Lock, LogOut, ShieldCheck, User } from "lucide-react";
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

function AppearanceRow({ darkMode, onToggle }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-900">Appearance</h2>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">Choose your preferred interface mode.</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={darkMode}
        aria-label={`${darkMode ? "Disable" : "Enable"} dark mode`}
        className={`flex h-7 w-14 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6] focus-visible:ring-offset-2 ${darkMode ? "bg-[#0077B6]" : "bg-slate-300"}`}
      >
        <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${darkMode ? "translate-x-7" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function StudentSettings({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const isProfileActive = location.pathname.endsWith("/profile");
  const isPasswordActive = location.pathname.endsWith("/change-password");

  return (
    <div className="animate-slide-up mx-auto w-full max-w-[332px] min-w-0 overflow-x-hidden text-sm">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-900">Settings</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">Manage your profile, security, and preferences.</p>
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_36px_-26px_rgba(15,23,42,0.32)]">
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

        <div className="border-t border-slate-200">
          <AppearanceRow darkMode={darkMode} onToggle={() => setDarkMode((value) => !value)} />
        </div>
      </section>

      <button
        type="button"
        onClick={onLogout}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Log out
      </button>
    </div>
  );
}

export default StudentSettings;
