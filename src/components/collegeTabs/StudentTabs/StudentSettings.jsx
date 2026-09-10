import { useState, useEffect } from "react";
import {
  ChevronRight,
  Edit3,
  Lock,
  LogOut,
  ShieldCheck,
  User,
  Monitor,
  Bell,
  Eye,
  EyeOff,
  HelpCircle,
  Info,
  Trash2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Settings,
  Sun,
  Moon,
  Laptop,
  KeyRound,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../../../utils/api";

function ToggleSetting({ title, description, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-900">{title}</p>
        <p className="text-[11px] leading-relaxed text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
          enabled ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            enabled ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function StudentSettings({ onLogout, isDrawer = false, onClose, onSwitchTab }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("currentUser") || "{}");

  // State: Theme
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("libralink_theme") || "light";
  });

  // State: Notifications
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("libralink_notifications");
    return saved
      ? JSON.parse(saved)
      : {
          borrowApprovals: true,
          dueReminders: true,
          campusNews: false,
        };
  });

  // State: Change Password Modal / Accordion
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // State: Modals & Feedback
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "success", message: "" });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  useEffect(() => {
    if (!toast.show) return undefined;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2800);
    return () => clearTimeout(timer);
  }, [toast.show]);

  // Apply Theme Changes
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("libralink_theme", newTheme);

    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else if (newTheme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
    showToast("success", `Interface theme set to ${newTheme} mode.`);
  };

  // Toggle Notifications
  const handleNotificationToggle = (key, value) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    localStorage.setItem("libralink_notifications", JSON.stringify(updated));
    showToast("success", "Notification preference updated.");
  };

  // Handle Change Password Form
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      showToast("error", "Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      showToast("error", "New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("error", "New passwords do not match.");
      return;
    }

    try {
      setUpdatingPassword(true);
      const { error } = await changePassword(currentPassword, newPassword);
      if (error) throw error;

      showToast("success", "Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    } catch (err) {
      console.error("Change password error:", err);
      showToast(
        "error",
        err.message || "Failed to update password. Check your current password."
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Clear Search History & Cached Books
  const handleClearCache = () => {
    try {
      localStorage.removeItem("searchHistory");
      localStorage.removeItem("libralink_cached_fav_books");
      localStorage.removeItem("libralink_history_cache");
      setShowClearCacheModal(false);
      showToast("success", "Search history & cached library data cleared!");
    } catch (err) {
      showToast("error", "Could not clear temporary cache.");
    }
  };

  const handleNavigateTo = (panelOrRoute) => {
    if (onSwitchTab) {
      onSwitchTab(panelOrRoute);
    } else {
      navigate(`/studentpage/${panelOrRoute}`);
    }
  };

  return (
    <div className={`w-full ${isDrawer ? "max-w-[380px]" : "max-w-[500px] py-6 px-3 sm:px-0"} mx-auto min-w-0 text-slate-800`}>
      {/* Toast Alert */}
      {toast.show && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
          <div
            role="alert"
            className={`flex items-center gap-3 p-3.5 rounded-xl border bg-white border-slate-200 backdrop-blur-md ${
              toast.type === "success"
                ? "border-emerald-300 text-emerald-900"
                : "border-rose-300 text-rose-900"
            }`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                toast.type === "success"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
            </div>
            <p className="flex-1 text-xs font-semibold leading-relaxed break-words">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              aria-label="Close alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Unified Switch: Profile & ID vs Settings */}
      <div className="mb-4 flex items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/80">
        <button
          type="button"
          onClick={() => handleNavigateTo("profile")}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 transition-all hover:bg-slate-200/50"
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>Profile & Library ID</span>
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all bg-white text-blue-600 border border-slate-300"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Settings</span>
        </button>
      </div>

      {/* 1. APPEARANCE & DISPLAY THEME */}
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Monitor className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Appearance & Theme
            </h3>
            <p className="text-[11px] text-slate-500">Personalize library readability</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleThemeChange("light")}
            className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all ${
              theme === "light"
                ? "border-blue-600 bg-blue-50/60 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Sun className="h-4 w-4" />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange("dark")}
            className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all ${
              theme === "dark"
                ? "border-blue-600 bg-blue-50/60 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Moon className="h-4 w-4" />
            <span>Dark</span>
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange("system")}
            className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all ${
              theme === "system"
                ? "border-blue-600 bg-blue-50/60 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Laptop className="h-4 w-4" />
            <span>System</span>
          </button>
        </div>
      </section>

      {/* 2. ACCOUNT SECURITY & CHANGE PASSWORD */}
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Account Security
              </h3>
              <p className="text-[11px] text-slate-500">Protect your student account</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
          >
            {showPasswordSection ? "Close" : "Change"}
          </button>
        </div>

        {showPasswordSection ? (
          <form onSubmit={handleChangePassword} className="mt-3.5 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPw ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 pr-8 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 pr-8 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {updatingPassword ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              Update Password
            </button>
          </form>
        ) : (
          <div className="mt-3 flex items-center justify-between text-xs py-1">
            <span className="text-slate-500">Password status</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              Protected
            </span>
          </div>
        )}
      </section>

      {/* 3. BORROWING & LOAN NOTIFICATIONS */}
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Loan Notifications
            </h3>
            <p className="text-[11px] text-slate-500">Alerts on book reservations & due dates</p>
          </div>
        </div>

        <div className="mt-1 divide-y divide-slate-100">
          <ToggleSetting
            title="Loan Approvals"
            description="Alert when book is ready for library pickup"
            enabled={notifications.borrowApprovals}
            onChange={(val) => handleNotificationToggle("borrowApprovals", val)}
          />
          <ToggleSetting
            title="Due Date Reminders"
            description="Notice 2 days prior to loan return deadline"
            enabled={notifications.dueReminders}
            onChange={(val) => handleNotificationToggle("dueReminders", val)}
          />
          <ToggleSetting
            title="Campus Library News"
            description="Notices regarding library operating hours"
            enabled={notifications.campusNews}
            onChange={(val) => handleNotificationToggle("campusNews", val)}
          />
        </div>
      </section>

      {/* 4. CACHE & STORAGE MANAGEMENT */}
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Clear Search Cache</h3>
              <p className="text-[11px] text-slate-500">Reset local query history & book cache</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowClearCacheModal(true)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors"
          >
            Clear
          </button>
        </div>
      </section>

      {/* 5. SYSTEM INFO */}
      <div className="mb-4 px-2 text-center">
        <p className="text-[11px] font-semibold text-slate-500">
          Libralink College System • v2.4.0
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Campus Portal • 2026 Academic Edition
        </p>
      </div>

      {/* 6. LOGOUT BUTTON */}
      <button
        type="button"
        onClick={() => setShowLogoutModal(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 active:translate-y-px transition-all mb-8"
      >
        <LogOut className="h-4 w-4" />
        Log Out of Libralink
      </button>

      {/* MODAL: Clear Cache Confirmation */}
      {showClearCacheModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowClearCacheModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-xs rounded-2xl bg-white p-5 border border-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-3">
              <Trash2 className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Clear Search Cache?</h4>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              This will remove cached book cards and local search history. Your profile and active loans will remain intact.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowClearCacheModal(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearCache}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Logout Confirmation */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-xs rounded-2xl bg-white p-5 border border-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-3">
              <LogOut className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Log out of your session?</h4>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              You will be signed out from your Libralink student account. Any unsaved edits will be discarded.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Stay Logged In
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  if (onLogout) onLogout();
                }}
                className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentSettings;
