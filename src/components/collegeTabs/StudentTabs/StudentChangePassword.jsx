import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { changePassword } from "../../../utils/api";

function StudentChangePassword() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [visible, setVisible] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);

  const passwordChecks = [
    ["length", "At least 8 characters", form.newPassword.length >= 8],
    ["upper", "One uppercase letter", /[A-Z]/.test(form.newPassword)],
    ["number", "One number", /[0-9]/.test(form.newPassword)],
  ];
  const passwordScore = passwordChecks.filter(([, , valid]) => valid).length;
  const strengthLabel = passwordScore === 0 ? "Not started" : passwordScore === 3 ? "Strong password" : "Keep going";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    if (form.newPassword !== form.confirmPassword) {
      setStatus({ type: "error", message: "New passwords do not match." });
      return;
    }

    if (!passwordChecks.every(([, , valid]) => valid)) {
      setStatus({ type: "error", message: "Please meet all password requirements." });
      return;
    }

    setSaving(true);
    try {
      const { error } = await changePassword(form.currentPassword, form.newPassword);
      if (error) throw error;
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setStatus({ type: "success", message: "Your password was changed successfully." });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Unable to change your password." });
    } finally {
      setSaving(false);
    }
  };

  const renderPasswordInput = (name, label, placeholder, autoComplete) => {
    const inputId = `change-password-${name}`;
    const isVisible = visible[name];

    return (
      <label htmlFor={inputId} className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>
        <span className="relative block">
          <input
            id={inputId}
            type={isVisible ? "text" : "password"}
            value={form[name]}
            onChange={(event) => setForm({ ...form, [name]: event.target.value })}
            placeholder={placeholder}
            autoComplete={autoComplete}
            required
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-12 text-sm text-slate-900 outline-none transition focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/10"
          />
          <button
            type="button"
            onClick={() => setVisible({ ...visible, [name]: !isVisible })}
            aria-label={`${isVisible ? "Hide" : "Show"} ${label}`}
            className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6]"
          >
            {isVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </span>
      </label>
    );
  };

  return (
    <div className="animate-slide-up mx-auto w-full max-w-[880px] min-w-0 overflow-x-hidden">
      <header className="mb-5 flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF6FB] text-[#0077B6]">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0077B6]">Account security</p>
          <h1 className="mt-1 break-words text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-3xl">Change password</h1>
          <p className="mt-1 max-w-[55ch] text-sm leading-6 text-slate-500">Update your password to keep your Libralink account secure.</p>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.72fr)]">
        <form onSubmit={handleSubmit} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.3)] sm:p-5">
          <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600">
              <Lock className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Password details</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">Use a password only you know.</p>
            </div>
          </div>

          <div className="space-y-3">
            {renderPasswordInput("currentPassword", "Current password", "Enter current password", "current-password")}
            {renderPasswordInput("newPassword", "New password", "Enter new password", "new-password")}
            {renderPasswordInput("confirmPassword", "Confirm new password", "Repeat new password", "new-password")}
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3" aria-label="Password strength">
            <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-600">
              <span>Password strength</span>
              <span className={passwordScore === 3 ? "text-emerald-600" : "text-slate-500"}>{strengthLabel}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
              {[1, 2, 3].map((level) => (
                <span key={level} className={`h-1 rounded-full ${passwordScore >= level ? "bg-[#0077B6]" : "bg-slate-200"}`} />
              ))}
            </div>
          </div>

          {status.message && (
            <div
              role={status.type === "error" ? "alert" : "status"}
              aria-live={status.type === "error" ? "assertive" : "polite"}
              className={`mt-3 break-words rounded-lg border p-3 text-xs leading-5 ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
            >
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            aria-busy={saving}
            className="mt-4 flex min-h-11 w-full items-center justify-center rounded-lg bg-[#0077B6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#005F8F] active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6] focus-visible:ring-offset-2"
          >
            {saving ? "Changing password..." : "Update password"}
          </button>
        </form>

        <aside className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="mb-4 flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Password checklist</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">A strong password helps protect your library account.</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {passwordChecks.map(([, label, valid]) => (
              <div key={label} className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className={`h-4 w-4 shrink-0 ${valid ? "text-emerald-600" : "text-slate-300"}`} aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="text-xs leading-5 text-slate-500">Never share your password. Libralink staff will never ask for it.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default StudentChangePassword;
