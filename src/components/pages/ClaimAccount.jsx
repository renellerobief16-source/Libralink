import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { 
  FiArrowLeft, 
  FiArrowRight, 
  FiBookOpen,
  FiCheckCircle, 
  FiCopy, 
  FiCheck, 
  FiEye, 
  FiEyeOff, 
  FiLock, 
  FiShield, 
  FiUser, 
  FiMapPin,
  FiAlertTriangle
} from "react-icons/fi";
import { API_BASE_URL } from "../../utils/api";

export default function ClaimAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenFromUrl = searchParams.get('token') || '';
  const [studentIdInput, setStudentIdInput] = useState('');
  const [gmailInput, setGmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gmailError, setGmailError] = useState('');
  
  // School & One-time status
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(true);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [requiresGmail, setRequiresGmail] = useState(false);

  // Unlocked account state
  const [unlockedAccount, setUnlockedAccount] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Pre-fetch school info and verify if already claimed (One-Time Link Check)
  useEffect(() => {
    if (!tokenFromUrl) {
      setFetchingInfo(false);
      return;
    }

    fetch(`${API_BASE_URL}/auth/claim-info?token=${encodeURIComponent(tokenFromUrl)}`)
      .then(res => res.json())
      .then(result => {
        if (result?.already_claimed) {
          setAlreadyClaimed(true);
        }
        if (result?.success && result?.data) {
          setSchoolInfo(result.data);
          if (result.data.already_claimed) {
            setAlreadyClaimed(true);
          }
          // If masked_email is returned, this token is Gmail-locked
          if (result.data.masked_email) {
            setMaskedEmail(result.data.masked_email);
            setRequiresGmail(true);
          }
        }
      })
      .catch(() => {})
      .finally(() => setFetchingInfo(false));
  }, [tokenFromUrl]);

  const handleUnlockAccount = async (e) => {
    e?.preventDefault();
    const rawStudentId = String(studentIdInput || '').trim();
    const rawGmail = String(gmailInput || '').trim().toLowerCase();

    if (!rawStudentId) {
      setError('Please enter your Student Number or LRN to unlock your account.');
      return;
    }

    if (requiresGmail && !rawGmail) {
      setGmailError('Please enter the Gmail address this link was sent to.');
      return;
    }

    setLoading(true);
    setError('');
    setGmailError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/claim-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: tokenFromUrl || null,
          student_id: rawStudentId,
          submitted_gmail: rawGmail || undefined
        })
      });

      const result = await response.json();

      if (response.ok && result?.success && result?.data) {
        setUnlockedAccount(result.data);
        if (result.data.school_code) {
          localStorage.setItem('libralink_last_school_code', result.data.school_code);
        }
      } else if (result?.already_claimed) {
        setAlreadyClaimed(true);
        setError(result.message);
      } else if (result?.gmail_mismatch) {
        setGmailError(result.message);
      } else if (result?.gmail_required) {
        setGmailError(result.message);
      } else {
        setError(
          result?.message || 
          `Incorrect Student Number / LRN. Please verify your school ID or registration slip and try again.`
        );
      }
    } catch (err) {
      setError('Network connection error. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else if (type === 'password') {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const handleProceedToLogin = () => {
    if (unlockedAccount) {
      navigate('/login', {
        state: {
          schoolCode: unlockedAccount.school_code,
          email: unlockedAccount.portal_email
        }
      });
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-[#0077B6] selection:text-white">
      {/* Top Header */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img 
            src="/L.png" 
            alt="Libralink Logo" 
            className="h-8 w-8 object-contain transition-transform group-hover:scale-105" 
          />
          <span className="text-xl font-bold text-[#0F172A] tracking-tight group-hover:text-[#0077B6] transition-colors">
            Libralink
          </span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0077B6] transition-colors py-1 group"
        >
          <FiArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Return to Home</span>
        </Link>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 my-auto py-8">
        {alreadyClaimed ? (
          /* One-time Lock State: Cannot claim twice */
          <div className="bg-white border border-amber-200 rounded-2xl p-6 sm:p-7 shadow-xs text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <FiAlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 inline-block mb-2">
              Single-Use Link Expired
            </span>
            <h2 className="text-xl font-bold text-[#0F172A] mt-1">
              Account Already Claimed
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-2 leading-relaxed">
              For your institutional security, this temporary credentials link can only be used <strong>once</strong>. Your Libralink credentials have already been unlocked.
            </p>
            <div className="mt-6 pt-5 border-t border-slate-100">
              <Link
                to="/login"
                className="w-full inline-flex min-h-12 items-center justify-center gap-2 bg-[#0077B6] text-white font-bold text-sm uppercase tracking-wider rounded-lg shadow-sm hover:bg-[#005f92] transition-all"
              >
                <span>Proceed to Sign In</span>
                <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : !unlockedAccount ? (
          /* Step 1: Student Identity Verification Gate */
          <div>
            {/* Header with L.png Logo & Title */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <img 
                  src="/L.png" 
                  alt="Libralink" 
                  className="h-10 w-10 object-contain shadow-xs rounded-xl shrink-0" 
                />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0077B6]">
                    Libralink Verification
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
                    Unlock Your Account
                  </h1>
                </div>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-[#64748B] leading-relaxed">
                For security, this link can only be used once. Enter your registered <strong>Student Number</strong> or <strong>LRN</strong> below to reveal your credentials.
              </p>
            </div>

            {/* School Identified Upfront (ILAGAY MO ANG SCHOOL PARA MA READ AGAD) */}
            <div className="mb-4 p-3.5 rounded-xl bg-sky-50/90 border border-sky-200/80 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#0077B6] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FiBookOpen className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#0077B6]">
                    Registered Campus
                  </span>
                  <span className="block text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                    {schoolInfo?.school_name || 'Santa Rita College'}
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs font-black bg-white border border-sky-300 text-[#0077B6] px-2.5 py-1 rounded-md shadow-2xs shrink-0">
                {schoolInfo?.school_code || 'SRC'}
              </span>
            </div>

            {/* One-Time Access Security Warning Notice */}
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <FiAlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-amber-950 tracking-tight">
                      Security Warning: One-Time Unlock Only
                    </span>
                    <span className="text-[10px] bg-amber-200/90 text-amber-950 font-black px-1.5 py-0.5 rounded tracking-wide uppercase">
                      Single-Use Link
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900/90 mt-1 leading-relaxed">
                    This credentials link can only be accessed <strong>once</strong>. Once unlocked, copy or save your username and temporary password immediately, as this link will permanently expire and cannot be reopened.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 border-l-4 border-red-500 bg-red-50 p-3.5 rounded-r-md shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <FiShield className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-red-800 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Verification Form */}
            <form onSubmit={handleUnlockAccount} className="space-y-4">

              {/* Gmail Verification Field — shown only when link is Gmail-locked */}
              {requiresGmail && (
                <div>
                  <label 
                    htmlFor="gmailInput" 
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[.14em] text-[#0077B6]"
                  >
                    Your Gmail Address
                  </label>
                  <div className="relative">
                    <input
                      id="gmailInput"
                      type="email"
                      placeholder={maskedEmail ? `e.g. ${maskedEmail}` : "you@gmail.com"}
                      value={gmailInput}
                      onChange={(e) => {
                        setGmailInput(e.target.value);
                        setGmailError('');
                      }}
                      className="min-h-12 w-full border-2 border-[#0077B6]/70 bg-white px-4 text-base font-semibold text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20 shadow-xs"
                      autoFocus
                      autoComplete="email"
                    />
                  </div>
                  {maskedEmail && (
                    <p className="mt-1.5 text-[11px] text-slate-500 leading-normal">
                      Enter the Gmail that received this link: <strong className="text-[#0077B6]">{maskedEmail}</strong>
                    </p>
                  )}
                  {gmailError && (
                    <div className="mt-2 border-l-4 border-red-500 bg-red-50 p-3 rounded-r-md">
                      <p className="text-xs font-medium text-red-800 leading-relaxed">{gmailError}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label 
                  htmlFor="studentId" 
                  className="mb-1.5 block text-xs font-bold uppercase tracking-[.14em] text-[#64748B]"
                >
                  Student Number / LRN
                </label>
                <div className="relative">
                  <input
                    id="studentId"
                    type="text"
                    placeholder="e.g. 20-22252 or 12-digit LRN"
                    value={studentIdInput}
                    onChange={(e) => {
                      setStudentIdInput(e.target.value);
                      setError('');
                    }}
                    className="min-h-12 w-full border-2 border-[#0077B6] bg-white px-4 text-base font-semibold text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-[#0077B6]/20 shadow-xs"
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0077B6]">
                    <FiLock className="w-4 h-4" />
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500 leading-normal">
                  Enter <strong className="text-[#0F172A]">Student Number</strong> (e.g. 20-22252) or your <strong className="text-[#0F172A]">12-digit LRN</strong> as registered on your school ID or slip.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !studentIdInput.trim()}
                className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#0077B6] px-5 text-xs sm:text-sm font-bold uppercase tracking-[.12em] text-white transition hover:bg-[#005f92] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Verifying Identity..." : "Unlock & View Libralink Account"}
                {!loading && <FiArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {/* Direct Sign in link */}
            <div className="mt-8 pt-6 border-t border-slate-200 text-center space-y-2">
              <p className="text-xs text-slate-500">
                Already know your credentials or have a staff account?
              </p>
              <Link
                to="/login"
                className="text-xs font-bold text-[#0077B6] hover:underline inline-block"
              >
                Direct Sign In →
              </Link>
            </div>
          </div>
        ) : (
          /* Step 2: Unlocked Account Credentials View */
          <div className="animate-fadeIn">
            {/* Verified Campus Banner */}
            <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <FiCheckCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Identity Confirmed
                  </span>
                  <span className="font-mono text-[10px] bg-emerald-200/60 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                    {unlockedAccount.school_code}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {unlockedAccount.school_name}
                </p>
              </div>
            </div>

            {/* Account Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 space-y-5">
              <div className="border-b border-slate-100 pb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#0077B6]">
                    Official Library Borrower Account
                  </p>
                  <h2 className="text-xl font-bold text-[#0F172A] mt-1">
                    {unlockedAccount.student_name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded">
                      <FiUser className="w-3.5 h-3.5 text-slate-400" />
                      ID: {unlockedAccount.student_id}
                    </span>
                    {unlockedAccount.address && (
                      <span className="inline-flex items-center gap-1 text-slate-500 truncate max-w-[200px]">
                        <FiMapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {unlockedAccount.address}
                      </span>
                    )}
                  </div>
                </div>
                <img 
                  src="/L.png" 
                  alt="Libralink" 
                  className="h-9 w-9 object-contain shrink-0 mt-1" 
                />
              </div>

              {/* Portal Login Credentials Section */}
              <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Libralink Portal Username / Email
                  </label>
                  <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <span className="font-mono text-xs sm:text-sm font-semibold text-slate-900 truncate pr-2">
                      {unlockedAccount.portal_email}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(unlockedAccount.portal_email, 'email')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0077B6] hover:text-[#005f92] shrink-0 p-1"
                      title="Copy Email"
                    >
                      {copiedEmail ? <FiCheck className="w-4 h-4 text-emerald-600" /> : <FiCopy className="w-4 h-4" />}
                      <span>{copiedEmail ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Temporary Password
                  </label>
                  <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <span className="font-mono text-xs sm:text-sm font-bold text-[#0077B6] tracking-wider truncate pr-2 select-all">
                      {showPassword 
                        ? (unlockedAccount.temporary_password && unlockedAccount.temporary_password !== '••••••••' 
                            ? unlockedAccount.temporary_password 
                            : 'PasswordSetOnSlip123!') 
                        : "••••••••••••"}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <FiEyeOff className="w-3.5 h-3.5 text-slate-600" /> : <FiEye className="w-3.5 h-3.5 text-slate-600" />}
                        <span>{showPassword ? "Hide" : "Show"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(
                          unlockedAccount.temporary_password && unlockedAccount.temporary_password !== '••••••••'
                            ? unlockedAccount.temporary_password
                            : 'PasswordSetOnSlip123!',
                          'password'
                        )}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0077B6] hover:text-[#005f92] p-1 px-2 hover:bg-sky-50 rounded transition-colors"
                        title="Copy Password"
                      >
                        {copiedPassword ? <FiCheck className="w-3.5 h-3.5 text-emerald-600" /> : <FiCopy className="w-3.5 h-3.5" />}
                        <span>{copiedPassword ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Single-Use Locked Notice */}
              <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
                <FiAlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Important: Single-Use Link Now Claimed</strong>
                  <span className="text-[11px] text-amber-900/90 leading-relaxed block mt-0.5">
                    Make sure to copy or write down your email and password now. For your security, this credentials link cannot be reopened.
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleProceedToLogin}
                className="w-full inline-flex min-h-12 items-center justify-center gap-2 bg-[#0077B6] text-white font-bold text-sm uppercase tracking-wider rounded-lg shadow-sm hover:bg-[#005f92] hover:shadow-md transition-all"
              >
                <span>Proceed to Sign In</span>
                <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Security Badge */}
      <div className="w-full max-w-sm mx-auto text-center pb-6">
        <div className="inline-flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <FiShield className="w-3.5 h-3.5 text-[#0077B6]" />
          <span>Libralink Institutional Student Authentication</span>
        </div>
      </div>
    </div>
  );
}
