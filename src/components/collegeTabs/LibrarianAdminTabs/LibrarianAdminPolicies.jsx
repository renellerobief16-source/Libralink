import { useState, useEffect } from "react";
import {
  FiSliders,
  FiBook,
  FiCheck,
  FiClock,
  FiDollarSign,
  FiShield,
  FiAlertCircle,
  FiRefreshCw,
  FiRotateCcw,
  FiEye,
  FiBookmark,
  FiCalendar,
  FiUsers,
  FiInfo,
} from "react-icons/fi";
import api, { getLibraryPolicy, updateLibraryPolicy } from "../../../utils/api";

const PRESETS = [
  {
    id: "standard",
    name: "Standard Academic",
    description: "7-day loan, 5 books max, ₱5.00/day fine, free partner access",
    values: {
      max_borrow_limit: 5,
      home_borrowing_days: 7,
      max_renewals: 2,
      inter_school_library_use_only: true,
      enable_fines: true,
      fine_amount_per_day: 5.0,
      grace_period_days: 0,
      max_fine_cap: 500.0,
      enable_visiting_fee: false,
      visiting_fee_amount: 0.0,
      visiting_fee_type: "per_visit",
      visiting_policy_notes: "Visiting students from partner consortium schools are welcome to review books on-site. Please present your valid student ID upon entry.",
    },
  },
  {
    id: "strict",
    name: "Strict Circulation",
    description: "3-day loan, 3 books max, ₱10.00/day fine, ₱50 visiting fee",
    values: {
      max_borrow_limit: 3,
      home_borrowing_days: 3,
      max_renewals: 1,
      inter_school_library_use_only: true,
      enable_fines: true,
      fine_amount_per_day: 10.0,
      grace_period_days: 0,
      max_fine_cap: 300.0,
      enable_visiting_fee: true,
      visiting_fee_amount: 50.0,
      visiting_fee_type: "per_visit",
      visiting_policy_notes: "Visiting research fee applies. Valid school ID & library referral slip required at reception.",
    },
  },
  {
    id: "fine_free",
    name: "Fine-Free / Extended",
    description: "14-day loan, 5 books max, no overdue fees, free visitor access",
    values: {
      max_borrow_limit: 5,
      home_borrowing_days: 14,
      max_renewals: 3,
      inter_school_library_use_only: true,
      enable_fines: false,
      fine_amount_per_day: 0.0,
      grace_period_days: 0,
      max_fine_cap: 0.0,
      enable_visiting_fee: false,
      visiting_fee_amount: 0.0,
      visiting_fee_type: "per_visit",
      visiting_policy_notes: "Open reading room access for all registered consortium students with valid school ID.",
    },
  },
];

export default function LibrarianAdminPolicies() {
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [simulatedOverdueDays, setSimulatedOverdueDays] = useState(3);
  const [simulatedQuotaReached, setSimulatedQuotaReached] = useState(false);

  // Core policy state
  const [policy, setPolicy] = useState({
    max_borrow_limit: 5,
    home_borrowing_days: 7,
    max_renewals: 2,
    inter_school_library_use_only: true,
    enable_fines: true,
    fine_amount_per_day: 5.0,
    grace_period_days: 0,
    max_fine_cap: 500.0,
    enable_visiting_fee: false,
    visiting_fee_amount: 0.0,
    visiting_fee_type: "per_visit",
    visiting_policy_notes: "Visiting students from other consortium schools may review, read, and research this book on-site inside library premises.",
  });

  // Track pristine state for unsaved changes detection
  const [initialPolicy, setInitialPolicy] = useState(null);

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    const schoolId = localStorage.getItem("schoolId");
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [schoolRes, policyRes] = await Promise.all([
        api.get(`/schools/${schoolId}`),
        getLibraryPolicy(schoolId),
      ]);

      if (schoolRes.data) {
        setSchoolInfo(schoolRes.data);
      }

      if (policyRes.data) {
        const loaded = {
          max_borrow_limit:
            policyRes.data.max_borrow_limit !== undefined
              ? Number(policyRes.data.max_borrow_limit)
              : 5,
          home_borrowing_days:
            policyRes.data.home_borrowing_days !== undefined
              ? Number(policyRes.data.home_borrowing_days)
              : 7,
          max_renewals:
            schoolRes.data?.max_renewals !== undefined
              ? Number(schoolRes.data.max_renewals)
              : 2,
          inter_school_library_use_only:
            policyRes.data.inter_school_library_use_only === true ||
            policyRes.data.inter_school_library_use_only === "true",
          enable_fines:
            policyRes.data.enable_fines === true ||
            policyRes.data.enable_fines === "true",
          fine_amount_per_day:
            policyRes.data.fine_amount_per_day !== undefined
              ? Number(policyRes.data.fine_amount_per_day)
              : 5.0,
          grace_period_days:
            policyRes.data.grace_period_days !== undefined
              ? Number(policyRes.data.grace_period_days)
              : 0,
          max_fine_cap:
            policyRes.data.max_fine_cap !== undefined
              ? Number(policyRes.data.max_fine_cap)
              : 500.0,
          enable_visiting_fee:
            policyRes.data.enable_visiting_fee === true ||
            policyRes.data.enable_visiting_fee === "true",
          visiting_fee_amount:
            policyRes.data.visiting_fee_amount !== undefined
              ? Number(policyRes.data.visiting_fee_amount)
              : 0.0,
          visiting_fee_type:
            policyRes.data.visiting_fee_type || "per_visit",
          visiting_policy_notes:
            policyRes.data.visiting_policy_notes !== undefined
              ? String(policyRes.data.visiting_policy_notes)
              : "Visiting students from other consortium schools may review, read, and research this book on-site inside library premises.",
        };
        setPolicy(loaded);
        setInitialPolicy(loaded);
      }
    } catch (err) {
      console.error("Failed to fetch library policy:", err);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setPolicy((prev) => ({
      ...prev,
      ...preset.values,
    }));
  };

  const handleReset = () => {
    if (initialPolicy) {
      setPolicy(initialPolicy);
      setActivePreset(null);
    }
  };

  const hasUnsavedChanges =
    initialPolicy &&
    JSON.stringify(policy) !== JSON.stringify(initialPolicy);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const schoolId = localStorage.getItem("schoolId");
      if (!schoolId) throw new Error("Missing school identifier");

      const payload = {
        max_borrow_limit: Number(policy.max_borrow_limit) || 5,
        home_borrowing_days: Number(policy.home_borrowing_days) || 7,
        inter_school_library_use_only: Boolean(
          policy.inter_school_library_use_only
        ),
        enable_fines: Boolean(policy.enable_fines),
        fine_amount_per_day: Number(policy.fine_amount_per_day) || 0.0,
        grace_period_days: Number(policy.grace_period_days) || 0,
        max_fine_cap: Number(policy.max_fine_cap) || 500.0,
        enable_visiting_fee: Boolean(policy.enable_visiting_fee),
        visiting_fee_amount: Number(policy.visiting_fee_amount) || 0.0,
        visiting_fee_type: String(policy.visiting_fee_type || "per_visit"),
        visiting_policy_notes: String(policy.visiting_policy_notes || ""),
      };

      // 1. Update library_settings table (backend also updates schools table automatically)
      await updateLibraryPolicy(schoolId, {
        ...payload,
        max_renewals: policy.max_renewals,
      });

      // 2. Secondary school sync for backwards compatibility
      try {
        await api.put(`/schools/${schoolId}`, {
          default_borrow_days_student: payload.home_borrowing_days,
          max_books_student: payload.max_borrow_limit,
          fine_per_day: payload.fine_amount_per_day,
          grace_period: payload.grace_period_days,
          max_renewals: policy.max_renewals,
        });
      } catch (schoolErr) {
        console.warn("Secondary school sync note:", schoolErr.message);
      }

      setInitialPolicy(policy);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to save borrowing policy:", err);
      alert("Error saving policy: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  // Live Fine Calculation Simulation
  const calculatedFine = (() => {
    if (!policy.enable_fines) return 0;
    const billableDays = Math.max(0, simulatedOverdueDays - policy.grace_period_days);
    const raw = billableDays * policy.fine_amount_per_day;
    return policy.max_fine_cap > 0 ? Math.min(raw, policy.max_fine_cap) : raw;
  })();

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-xs font-medium text-slate-500">Loading borrowing policies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <FiSliders className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Borrowing & Circulation Policies
              </h1>
            </div>
            <p className="text-xs text-slate-500 sm:text-sm">
              Configure student loan limits, durations, overdue fees, and inter-school reading restrictions for{" "}
              <strong className="text-slate-800">{schoolInfo?.school_name || "your campus library"}</strong>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition"
              >
                <FiRotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition active:scale-95 ${
                saving
                  ? "cursor-wait bg-blue-400"
                  : "bg-blue-600 hover:bg-blue-700 shadow-sm"
              }`}
            >
              {saving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving Policy...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <FiCheck className="h-4 w-4 text-white" />
                  <span>Policy Saved!</span>
                </>
              ) : (
                <>
                  <FiCheck className="h-4 w-4 text-white" />
                  <span>Save Policy Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Quick Policy Presets
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const isSelected = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-bold">{preset.name}</span>
                    <span className="ml-1.5 text-[10px] text-slate-500 font-normal">
                      ({preset.description})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* 1. Loan Duration & Quota Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <FiBook className="h-3.5 w-3.5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Student Loan Quota & Duration</h2>
                <p className="text-[11px] text-slate-500">
                  Control how many items can be borrowed simultaneously and standard borrowing window.
                </p>
              </div>
            </div>

            {/* Max Borrow Limit Stepper */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Maximum Active Books Per Student
                </label>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-100">
                  {policy.max_borrow_limit} books
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Once a student reaches this active threshold, additional borrow requests are locked.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setPolicy((p) => ({
                        ...p,
                        max_borrow_limit: Math.max(1, p.max_borrow_limit - 1),
                      }))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-100 active:scale-95 text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-slate-900">
                    {policy.max_borrow_limit}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPolicy((p) => ({
                        ...p,
                        max_borrow_limit: Math.min(15, p.max_borrow_limit + 1),
                      }))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-100 active:scale-95 text-sm font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {[3, 5, 7, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPolicy((p) => ({ ...p, max_borrow_limit: num }))}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                        policy.max_borrow_limit === num
                          ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Standard Loan Period Days */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Standard Loan Period (Days)
                </label>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-100">
                  {policy.home_borrowing_days} Days
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Due dates are automatically calculated from the moment of librarian counter release.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[3, 5, 7, 14, 21, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setPolicy((p) => ({ ...p, home_borrowing_days: days }))}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      policy.home_borrowing_days === days
                        ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-xs text-slate-400">Custom:</span>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={policy.home_borrowing_days}
                    onChange={(e) =>
                      setPolicy((p) => ({
                        ...p,
                        home_borrowing_days: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-800 text-center outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Max Renewals Allowed */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Maximum Renewals Per Book
                </label>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                  {policy.max_renewals} {policy.max_renewals === 1 ? "time" : "times"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3, 5].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setPolicy((p) => ({ ...p, max_renewals: count }))}
                    className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                      policy.max_renewals === count
                        ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {count === 0 ? "No renewals" : `${count}x`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Inter-School Consortium Rules */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <FiShield className="h-3.5 w-3.5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Consortium & Inter-School Visiting Policy</h2>
                <p className="text-[11px] text-slate-500">
                  Rules and fees when visiting students from other consortium schools visit your library.
                </p>
              </div>
            </div>

            {/* Reading room restriction toggle */}
            <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-800 block">
                  In-Library Reading Room Only for Partner Schools
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  When enabled, students from partner schools cannot take your books off-campus; they are authorized exclusively for reading room use on your campus.
                </p>
              </div>

              <label className="relative inline-flex cursor-pointer items-center shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={policy.inter_school_library_use_only}
                  onChange={(e) =>
                    setPolicy((p) => ({
                      ...p,
                      inter_school_library_use_only: e.target.checked,
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-blue-600 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>

            {/* Visiting student fee toggle & settings */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Visiting Student Access Fee
                    </span>
                    {policy.enable_visiting_fee ? (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Paid Access (₱{Number(policy.visiting_fee_amount || 0).toFixed(2)})
                      </span>
                    ) : (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Free Entry
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Charge students from partner schools an access or research fee when visiting your campus library.
                  </p>
                </div>

                <label className="relative inline-flex cursor-pointer items-center shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={policy.enable_visiting_fee}
                    onChange={(e) =>
                      setPolicy((p) => ({
                        ...p,
                        enable_visiting_fee: e.target.checked,
                        visiting_fee_amount: e.target.checked && (!p.visiting_fee_amount || p.visiting_fee_amount <= 0) ? 50.0 : p.visiting_fee_amount,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-blue-600 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                </label>
              </div>

              {policy.enable_visiting_fee && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3 animate-slide-up">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">
                        Fee Amount (₱)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                          ₱
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={policy.visiting_fee_amount}
                          onChange={(e) =>
                            setPolicy((p) => ({
                              ...p,
                              visiting_fee_amount: Math.max(0, parseFloat(e.target.value) || 0),
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-7 pr-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">
                        Fee Billing Frequency
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPolicy((p) => ({ ...p, visiting_fee_type: "per_visit" }))}
                          className={`rounded-xl border py-2 text-xs font-bold transition ${
                            policy.visiting_fee_type === "per_visit"
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Per Visit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPolicy((p) => ({ ...p, visiting_fee_type: "per_day" }))}
                          className={`rounded-xl border py-2 text-xs font-bold transition ${
                            policy.visiting_fee_type === "per_day"
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Per Day
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">Quick rates:</span>
                    {[20, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPolicy((p) => ({ ...p, visiting_fee_amount: amt }))}
                        className={`rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${
                          policy.visiting_fee_amount === amt
                            ? "border-blue-600 bg-blue-100/60 text-blue-800"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        ₱{amt}.00
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Visiting Guidelines & Terms text */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Visiting Guidelines & Campus Instructions
                </label>
                <span className="text-[10px] text-slate-400">
                  Displayed to students before borrowing
                </span>
              </div>
              <textarea
                rows={3}
                value={policy.visiting_policy_notes}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    visiting_policy_notes: e.target.value,
                  }))
                }
                placeholder="e.g., Visiting students must present valid school ID and referral letter at the guard desk. Open Monday to Friday, 8:00 AM - 5:00 PM."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed text-slate-800 outline-none focus:border-blue-500 resize-none shadow-2xs"
              />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-400 font-medium">Templates:</span>
                <button
                  type="button"
                  onClick={() =>
                    setPolicy((p) => ({
                      ...p,
                      visiting_policy_notes:
                        "Visiting students must present a valid School ID and referral slip upon arrival at the circulation desk.",
                    }))
                  }
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  ID & Referral Slip
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPolicy((p) => ({
                      ...p,
                      visiting_policy_notes:
                        "Reading room access only. Visiting hours: Mon-Fri 8:00 AM - 4:00 PM. Maximum 2 hours per session.",
                    }))
                  }
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  Visiting Hours Window
                </button>
              </div>
            </div>
          </div>

          {/* 3. Overdue Fine Policy Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <FiDollarSign className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Overdue Fines & Penalties</h2>
                  <p className="text-[11px] text-slate-500">
                    Automatic penalty assessment on late book returns.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex cursor-pointer items-center shrink-0">
                <input
                  type="checkbox"
                  checked={policy.enable_fines}
                  onChange={(e) =>
                    setPolicy((p) => ({
                      ...p,
                      enable_fines: e.target.checked,
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-blue-600 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>

            {policy.enable_fines ? (
              <div className="space-y-4 pt-1">
                {/* Fine Rate per day */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Daily Fine Amount (₱ / day)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                        ₱
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.50"
                        value={policy.fine_amount_per_day}
                        onChange={(e) =>
                          setPolicy((p) => ({
                            ...p,
                            fine_amount_per_day: Math.max(0, parseFloat(e.target.value) || 0),
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Grace Period */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Grace Period (Days)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="14"
                        value={policy.grace_period_days}
                        onChange={(e) =>
                          setPolicy((p) => ({
                            ...p,
                            grace_period_days: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Fines only accrue after this number of overdue days.
                    </span>
                  </div>
                </div>

                {/* Maximum Fine Cap */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Maximum Fine Cap Per Book (₱)
                    </label>
                    <span className="text-[11px] font-bold text-slate-700">
                      ₱{Number(policy.max_fine_cap).toFixed(2)}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                      ₱
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={policy.max_fine_cap}
                      onChange={(e) =>
                        setPolicy((p) => ({
                          ...p,
                          max_fine_cap: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Prevents excessive penalization. Overdue calculation stops once this ceiling is reached.
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                <FiCheck className="mx-auto h-5 w-5 text-emerald-600 mb-1" />
                <p className="text-xs font-bold text-slate-700">Fine-Free Borrowing is Enabled</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Students returning overdue books will not incur monetary penalties.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Live Student Preview (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="sticky top-6 space-y-6">
            {/* Live Student Experience Preview */}
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/40 via-white to-white p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs">
                    <FiEye className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    Live Student View
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Real-Time Sync
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                This shows exactly how students will see your library's terms when browsing your catalogue:
              </p>

              {/* Exact Mock of Student Borrowing Policy Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800">Borrowing Policy</span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full truncate max-w-[150px]">
                    {schoolInfo?.school_name || "Your Campus"}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Loan Period Box */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Loan Duration
                    </span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {policy.home_borrowing_days} Days Standard Loan
                    </span>
                    {policy.inter_school_library_use_only && (
                      <span className="block text-[10px] text-amber-700 font-medium mt-0.5">
                        (Reading room only for visiting partner students)
                      </span>
                    )}
                  </div>

                  {/* Limit Box */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Borrowing Quota
                    </span>
                    <span className="font-semibold text-slate-800 text-xs">
                      Up to {policy.max_borrow_limit} active books per student
                    </span>
                  </div>

                  {/* Fines Box */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Overdue Penalty
                    </span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {policy.enable_fines
                        ? `₱${Number(policy.fine_amount_per_day).toFixed(2)}/day after due date`
                        : "Fine-free borrowing"}
                    </span>
                    {policy.enable_fines && policy.grace_period_days > 0 && (
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        ({policy.grace_period_days}-day grace period applies)
                      </span>
                    )}
                    {policy.enable_fines && policy.max_fine_cap > 0 && (
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        (Max fine capped at ₱{Number(policy.max_fine_cap).toFixed(2)})
                      </span>
                    )}
                  </div>

                  {/* Inter-School Visiting Terms Box */}
                  <div className="p-2.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-indigo-900">
                        Visiting Student Terms
                      </span>
                      {policy.enable_visiting_fee ? (
                        <span className="rounded-md bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[9px] font-bold">
                          ₱{Number(policy.visiting_fee_amount || 0).toFixed(2)} / {policy.visiting_fee_type === "per_day" ? "Day" : "Visit"}
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[9px] font-bold">
                          Free Access
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-indigo-950 font-medium leading-relaxed">
                      {policy.visiting_policy_notes || "Visiting students may review materials on-site."}
                    </p>
                  </div>

                  {/* Simulated Quota Reached Warning */}
                  {simulatedQuotaReached && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                      <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-xs">Borrowing Limit Reached</p>
                        <p className="text-[11px] text-amber-700 leading-tight mt-0.5">
                          You currently have {policy.max_borrow_limit} active book(s). Return an active loan to borrow more.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Simulated Borrow Button */}
                <div className="pt-2">
                  {simulatedQuotaReached ? (
                    <button
                      disabled
                      className="w-full rounded-xl bg-slate-200 py-2.5 text-center text-xs font-bold text-slate-400 cursor-not-allowed"
                    >
                      Borrowing Limit Reached ({policy.max_borrow_limit}/{policy.max_borrow_limit})
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-xl bg-blue-600 py-2.5 text-center text-xs font-bold text-white shadow-xs"
                    >
                      Borrow This Book ({policy.home_borrowing_days} Days)
                    </button>
                  )}
                </div>
              </div>

              {/* Simulation Sandbox Controls */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Interactive Penalty Tester
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Simulate return delay:</span>
                    <span className="font-bold text-slate-900">{simulatedOverdueDays} days late</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={simulatedOverdueDays}
                    onChange={(e) => setSimulatedOverdueDays(parseInt(e.target.value) || 1)}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-600 font-medium">Calculated Fine:</span>
                  <span className="font-bold text-blue-700 text-sm">
                    {policy.enable_fines ? `₱${calculatedFine.toFixed(2)}` : "₱0.00 (Fine-free)"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-600">Preview Quota Lock:</span>
                  <button
                    type="button"
                    onClick={() => setSimulatedQuotaReached((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      simulatedQuotaReached
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    {simulatedQuotaReached ? "Quota Reached" : "Normal Under Quota"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
