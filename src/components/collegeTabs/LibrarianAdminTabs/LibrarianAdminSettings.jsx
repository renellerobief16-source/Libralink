import { useState, useEffect, useRef } from "react";
import { 
  FiSettings, 
  FiUser, 
  FiLock, 
  FiShield, 
  FiBook, 
  FiCheck, 
  FiAlertCircle, 
  FiSliders, 
  FiClock, 
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiUploadCloud, 
  FiCalendar,
  FiInfo,
  FiArrowRight,
  FiCheckCircle,
  FiRefreshCw
} from "react-icons/fi";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import api, { getLibraryPolicy, getBackendAssetUrl } from "../../../utils/api";

function LibrarianAdminSettings({ onNavigate }) {
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Library & Campus Profile State
  const [libraryName, setLibraryName] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");

  // Operating Hours & Schedule State
  const [operatingDays, setOperatingDays] = useState("Monday – Friday");
  const [operatingHours, setOperatingHours] = useState("8:00 AM – 5:00 PM");
  const [operatingNotes, setOperatingNotes] = useState("Open for faculty, staff, and enrolled students. Closed during official institutional holidays.");

  // Logo Upload State
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const fileInputRef = useRef(null);

  // Unified Policy Summary State (Read-only summary linked to Borrowing Policies studio)
  const [policy, setPolicy] = useState({
    max_borrow_limit: 5,
    home_borrowing_days: 7,
    inter_school_library_use_only: true,
    enable_fines: false,
    fine_amount_per_day: 5.0,
    grace_period_days: 0,
    max_fine_cap: 500.0,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const schoolId = localStorage.getItem("schoolId");
      if (!schoolId) {
        console.error("No schoolId found in localStorage");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Fetch school identity info
        const schoolResponse = await api.get(`/schools/${schoolId}`);
        const schoolData = schoolResponse.data;
        if (schoolData) {
          setSchoolInfo(schoolData);
          setLibraryName(schoolData.school_name || "");
          setAddress(schoolData.address || "");
          setContactNumber(schoolData.contact_number || "");
          setEmail(schoolData.email || "");

          if (schoolData.logo) {
            setLogoPreview(getBackendAssetUrl(schoolData.logo));
          }
        }

        // 2. Load stored operating hours if present
        const cachedHours = localStorage.getItem(`lib_hours_${schoolId}`);
        if (cachedHours) {
          try {
            const parsed = JSON.parse(cachedHours);
            if (parsed.days) setOperatingDays(parsed.days);
            if (parsed.hours) setOperatingHours(parsed.hours);
            if (parsed.notes) setOperatingNotes(parsed.notes);
          } catch {
            // fallback to default
          }
        }

        // 3. Fetch unified active library policy for overview card
        const policyRes = await getLibraryPolicy(schoolId);
        if (policyRes.data) {
          setPolicy({
            max_borrow_limit: policyRes.data.max_borrow_limit !== undefined ? Number(policyRes.data.max_borrow_limit) : 5,
            home_borrowing_days: policyRes.data.home_borrowing_days !== undefined ? Number(policyRes.data.home_borrowing_days) : 7,
            inter_school_library_use_only: policyRes.data.inter_school_library_use_only === true || policyRes.data.inter_school_library_use_only === "true",
            enable_fines: policyRes.data.enable_fines === true || policyRes.data.enable_fines === "true",
            fine_amount_per_day: policyRes.data.fine_amount_per_day !== undefined ? Number(policyRes.data.fine_amount_per_day) : 5.0,
            grace_period_days: policyRes.data.grace_period_days !== undefined ? Number(policyRes.data.grace_period_days) : 0,
            max_fine_cap: policyRes.data.max_fine_cap !== undefined ? Number(policyRes.data.max_fine_cap) : 500.0,
          });
        }
      } catch (error) {
        console.error("Error fetching school settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG, SVG)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Logo image must be smaller than 5MB");
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setErrorMessage("");
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage("");

    try {
      const schoolId = localStorage.getItem("schoolId");
      if (!schoolId) throw new Error("No active school ID found");

      // 1. If a new logo was uploaded, send to logo endpoint
      let updatedLogoUrl = schoolInfo?.logo;
      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        try {
          const logoRes = await api.post(`/schools/${schoolId}/logo`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (logoRes.data?.logoUrl) {
            updatedLogoUrl = logoRes.data.logoUrl;
          }
        } catch (logoErr) {
          console.warn("Logo upload issue:", logoErr);
        }
      }

      // 2. Update school profile fields
      await api.put(`/schools/${schoolId}`, {
        school_name: libraryName,
        address: address,
        contact_number: contactNumber,
        email: email,
      });

      // 3. Cache operating schedule
      localStorage.setItem(
        `lib_hours_${schoolId}`,
        JSON.stringify({
          days: operatingDays,
          hours: operatingHours,
          notes: operatingNotes,
        })
      );

      const updatedSchoolObj = {
        ...schoolInfo,
        school_name: libraryName,
        address,
        contact_number: contactNumber,
        email,
        logo: updatedLogoUrl,
      };

      // Refresh school profile locally
      setSchoolInfo(updatedSchoolObj);
      if (updatedLogoUrl) {
        setLogoPreview(getBackendAssetUrl(updatedLogoUrl));
      }
      setLogoFile(null);

      // Broadcast event for instant header & portal synchronization
      window.dispatchEvent(
        new CustomEvent("libralink-school-updated", { detail: updatedSchoolObj })
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4500);
    } catch (error) {
      console.error("Error saving settings:", error);
      setErrorMessage(error.response?.data?.message || error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FiSettings className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              Library & Campus Settings
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium ml-10">
            Manage your institution's profile, contact details, operating schedule, and library identity
          </p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl animate-fade-in shrink-0 shadow-2xs">
            <FiCheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2.5">
          <FiAlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <Card>
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500">Loading library profile and configuration...</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Borrowing & Circulation Policy (Overview & Studio Link) */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-white p-5 sm:p-6 shadow-xs">
            {/* Background Ambient Glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-2xs">
                    <FiSliders className="w-3 h-3" />
                    <span>Dedicated Policy Studio</span>
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">Consortium Standard Active</span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  Borrowing & Circulation Policy Configuration
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  Loan limits, borrowing periods, overdue penalty rates, and inter-school visitor rules are now managed in your dedicated <strong className="text-slate-800">Borrowing Policies</strong> tab to prevent duplication and ensure real-time consortium consistency.
                </p>

                {/* Quick-Policy Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  <div className="p-3 bg-white/80 backdrop-blur-xs border border-blue-100 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Max Allowance</span>
                    <span className="text-sm font-extrabold text-blue-700">
                      {policy.max_borrow_limit} Books
                    </span>
                  </div>

                  <div className="p-3 bg-white/80 backdrop-blur-xs border border-blue-100 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Loan Period</span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {policy.home_borrowing_days} Days
                    </span>
                  </div>

                  <div className="p-3 bg-white/80 backdrop-blur-xs border border-blue-100 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Daily Fine</span>
                    <span className="text-sm font-extrabold text-amber-700">
                      {policy.enable_fines ? `₱${Number(policy.fine_amount_per_day).toFixed(2)}/day` : "Fine-Free"}
                    </span>
                  </div>

                  <div className="p-3 bg-white/80 backdrop-blur-xs border border-blue-100 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Partner Access</span>
                    <span className="text-sm font-extrabold text-indigo-700 truncate block" title={policy.inter_school_library_use_only ? "In-Library Reading Only" : "Takeout Permitted"}>
                      {policy.inter_school_library_use_only ? "In-Library Use" : "Takeout Allowed"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Navigation Button */}
              <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2">
                <Button
                  onClick={() => onNavigate && onNavigate("policies")}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <FiSliders className="w-4 h-4" />
                  <span>Open Policy Studio</span>
                  <FiArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <span className="text-[11px] text-center text-slate-400 font-medium">
                  Configure presets, fines, & limits
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Library Profile & Identity */}
          <Card>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <FiUser className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Library Profile & Branding</h3>
                <p className="text-xs text-slate-500">Manage your official library name, campus code, and institution logo</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Logo Preview & Uploader */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                <div className="relative w-20 h-20 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs flex items-center justify-center shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Campus Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <img src="/L.png" alt="Default Logo" className="w-12 h-12 object-contain opacity-60" />
                  )}
                </div>

                <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <FiUploadCloud className="w-3.5 h-3.5" />
                      <span>{logoPreview ? "Change Logo" : "Upload Logo"}</span>
                    </button>
                    {logoFile && (
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        New file selected ({logoFile.name})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Recommended: Transparent PNG or SVG, minimum 200x200 pixels (Max 5MB)
                  </p>
                </div>
              </div>

              {/* Display Name & Verified Codes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Library Display Name
                  </label>
                  <input
                    type="text"
                    value={libraryName}
                    onChange={(e) => setLibraryName(e.target.value)}
                    placeholder="e.g. Santa Rita College Library"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Public title seen by students and visiting consortium borrowers
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <FiShield className="w-3.5 h-3.5 text-slate-400" />
                    <span>School Code</span>
                  </label>
                  <input
                    type="text"
                    value={schoolInfo?.school_code || "SRC"}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Verified system identifier
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Campus Location & Official Contact */}
          <Card>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                <FiMapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Campus Location & Contact Information</h3>
                <p className="text-xs text-slate-500">Provide official campus address, telephone, and desk contact information</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FiMapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Physical Campus Address</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. McArthur Highway, Guiguinto, Bulacan, Philippines"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FiPhone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Official Contact / Telephone</span>
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="e.g. +63 (044) 794-1234 / 0917-123-4567"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FiMail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Official Library Email</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. library@src.edu.ph"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Library Operating Hours & Schedule */}
          <Card>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                <FiClock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Library Operating Schedule & Hours</h3>
                <p className="text-xs text-slate-500">Set open desk hours, active reading room days, and visitor access reminders</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FiCalendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Service Days</span>
                  </label>
                  <input
                    type="text"
                    value={operatingDays}
                    onChange={(e) => setOperatingDays(e.target.value)}
                    placeholder="e.g. Monday – Friday (Closed on Weekends)"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FiClock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Daily Operating Hours</span>
                  </label>
                  <input
                    type="text"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                    placeholder="e.g. 8:00 AM – 5:00 PM"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FiInfo className="w-3.5 h-3.5 text-blue-600" />
                  <span>Desk & Holiday Notice</span>
                </label>
                <textarea
                  rows="2"
                  value={operatingNotes}
                  onChange={(e) => setOperatingNotes(e.target.value)}
                  placeholder="e.g. Special research hours apply during examination weeks. Closed during official institutional holidays."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs resize-none"
                />
              </div>
            </div>
          </Card>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Changes update your public library profile across the consortium immediately.
            </p>

            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 px-6 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <FiCheck className="w-3.5 h-3.5" />
                  <span>Save Library Settings</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarianAdminSettings;
