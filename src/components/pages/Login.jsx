import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn, API_BASE_URL } from "../../utils/api";
import { 
  FiMail, 
  FiLock, 
  FiArrowLeft,
  FiArrowRight, 
  FiCheck, 
  FiEye, 
  FiEyeOff, 
  FiShield, 
  FiUser,
  FiBookOpen,
  FiLayers,
  FiCheckCircle,
  FiX
} from "react-icons/fi";

function normalizeCampusKey(college) {
  const normalizedValue = String(college || "").trim().toLowerCase();

  if (!normalizedValue) return "";
  if (normalizedValue.includes("guagua") || normalizedValue.includes("gnc")) return "guagua";
  if (normalizedValue.includes("santarita") || normalizedValue.includes("src")) return "santarita";

  return normalizedValue;
}

function normalizeUserRecord(user) {
  if (!user) return null;

  const email = String(user.email || "").toLowerCase();
  const metadata = user.user_metadata || user.app_metadata || {};
  const authRole = String(user.role || "").toLowerCase();
  const normalizedRole = metadata.role || (authRole === "admin" || authRole === "student"
    ? authRole
    : email.includes("admin")
      ? "admin"
      : "student");
  const normalizedCollege = normalizeCampusKey(
    metadata.college || user.college || (
      email.includes("adminsrc") || email.includes("src_") || email.includes("santarita")
        ? "santarita"
        : email.includes("admingnc") || email.includes("gnc_") || email.includes("guagua")
          ? "guagua"
          : ""
    )
  );

  const normalizedFirstName = String(
    metadata.firstName || metadata.first_name || user.firstName || user.first_name || ""
  ).trim();
  const normalizedLastName = String(
    metadata.lastName || metadata.last_name || user.lastName || user.last_name || ""
  ).trim();

  const mergedRecord = {
    id: user.id,
    email,
    role: normalizedRole,
    college: normalizedCollege,
    ...user,
    ...metadata,
  };

  mergedRecord.college = normalizeCampusKey(mergedRecord.college || normalizedCollege);

  const resolvedName = [normalizedFirstName, normalizedLastName]
    .filter(Boolean)
    .join(' ') || mergedRecord.full_name || mergedRecord.name || '';

  mergedRecord.first_name = normalizedFirstName;
  mergedRecord.last_name = normalizedLastName;
  mergedRecord.full_name = resolvedName;
  mergedRecord.name = resolvedName;

  return mergedRecord;
}

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetRecoveryEmail, setResetRecoveryEmail] = useState("");
  const [resetUsername, setResetUsername] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetStep, setResetStep] = useState('find_account'); // find_account, choose_method, code, password, success

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleFindAccount = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/find-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: resetEmail || null,
          username: resetUsername || null
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetEmail(data.email || resetEmail);
        setResetRecoveryEmail(data.recovery_email || '');
        setResetStep('choose_method');
      } else {
        setResetError(data.message || 'Account not found. Please try again.');
      }
    } catch (err) {
      setResetError('Network error. Please check your connection and try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetRecoveryEmail(data.recovery_email || '');
        setResetStep('code');
        if (data.code) {
          console.log('Password reset code:', data.code);
        }
      } else {
        setResetError(data.message || 'Failed to send reset code. Please try again.');
      }
    } catch (err) {
      setResetError('Network error. Please check your connection and try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyResetCode = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");

    if (resetPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match. Please try again.');
      setResetLoading(false);
      return;
    }

    if (resetPassword.length < 8) {
      setResetError('Password must be at least 8 characters long.');
      setResetLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail, code: resetCode, new_password: resetPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetStep('success');
        setResetSuccess(true);
      } else {
        setResetError(data.message || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      setResetError('Network error. Please check your connection and try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const openForgotPassword = () => {
    setResetEmail(form.email);
    setShowForgotPassword(true);
    setResetStep('find_account');
    setResetSuccess(false);
    setResetError("");
    setResetCode("");
    setResetPassword("");
    setResetUsername("");
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setResetEmail("");
    setResetUsername("");
    setResetCode("");
    setResetPassword("");
    setResetConfirmPassword("");
    setResetRecoveryEmail("");
    setResetStep('find_account');
    setResetSuccess(false);
    setResetError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log('Attempting login with:', form.email);
      const { data, error: signInError } = await signIn(form.email, form.password);

      if (signInError) {
        console.error('Sign in error:', signInError);
        throw signInError;
      }

      const userRecord = data?.user;

      console.log('User record from API:', userRecord);
      console.log('User role from API:', userRecord?.role);
      console.log('User role_name from API:', userRecord?.role_name);
      console.log('User role_id from API:', userRecord?.role_id);

      // Check what was stored in localStorage by signIn function
      const storedUserRole = localStorage.getItem('userRole');
      const storedRoleId = localStorage.getItem('roleId');
      const storedSchoolId = localStorage.getItem('schoolId');
      const storedCollege = localStorage.getItem('userCollege');

      console.log('Stored userRole:', storedUserRole);
      console.log('Stored roleId:', storedRoleId);
      console.log('Stored schoolId:', storedSchoolId);
      console.log('Stored college:', storedCollege);

      // Use the stored values (set by signIn function)
      const routeRoleId = Number(storedRoleId || userRecord?.role_id || 0);
      const userRole = (storedUserRole || userRecord?.role || userRecord?.role_name || '').toLowerCase().trim();
      const schoolId = storedSchoolId || userRecord?.school_id;

      const normalizedRole = userRole.replace(/\s+/g, '_');

      console.log('Final userRole for routing:', normalizedRole);
      console.log('Final routeRoleId for routing:', routeRoleId);
      console.log('Final schoolId for routing:', schoolId);
      console.log('Route decision based on role_id:', routeRoleId);

      // Route based on role_id first, then fall back to the normalized role label
      // DB role mapping: 1 = Super Admin, 2 = Admin/Librarian Admin, 3 = Librarian, 4 = Student
      if (routeRoleId === 1) {
        console.log('Routing to superadmin portal (role_id 1)');
        navigate('/superadmin');
      } else if (routeRoleId === 2) {
        console.log('Routing to librarian admin portal (role_id 2)');
        navigate('/librarian-admin');
      } else if (routeRoleId === 3) {
        console.log('Routing to librarian portal (role_id 3)');
        navigate('/admin');
      } else if (routeRoleId === 4) {
        console.log('Routing to student portal (role_id 4)');
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const isComplete = !!(currentUser.username || currentUser.name || currentUser.first_name) && !!currentUser.contact_number && !!(currentUser.recovery_email || currentUser.email) && !!(currentUser.profile_picture || currentUser.profile_image) && !!currentUser.policy_accepted;
        navigate(isComplete ? '/studentpage' : '/student-onboarding');
      } else if (normalizedRole === 'super_admin') {
        console.log('Routing to superadmin portal (role name)');
        navigate('/superadmin');
      } else if (normalizedRole === 'librarian_admin' || normalizedRole === 'librarian admin') {
        console.log('Routing to librarian admin portal (role name)');
        navigate('/librarian-admin');
      } else if (normalizedRole === 'librarian') {
        console.log('Routing to librarian portal (role name)');
        navigate('/admin');
      } else if (normalizedRole === 'student') {
        console.log('Routing to student portal (role name)');
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const isComplete = !!(currentUser.username || currentUser.name || currentUser.first_name) && !!currentUser.contact_number && !!(currentUser.recovery_email || currentUser.email) && !!(currentUser.profile_picture || currentUser.profile_image) && !!currentUser.policy_accepted;
        navigate(isComplete ? '/studentpage' : '/student-onboarding');
      } else {
        // Default to login for unknown roles
        console.warn('Unknown role:', normalizedRole, 'redirecting to login');
        setError('Unable to determine your role. Please contact administrator.');
        navigate('/login');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-12 bg-[#F8FAFC] text-[#0F172A]">
      
      {/* LEFT COLUMN: Visual side with p2.jpg picture, animation & librarian elements (7 cols) */}
      <div className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-10 xl:p-14 bg-[#023E8A] text-white overflow-hidden">
        
        {/* Background effects matching Home Hero */}
        <div className="absolute inset-0 opacity-25 [background:radial-gradient(circle_at_80%_20%,#7DD3FC,transparent_35%),radial-gradient(circle_at_20%_90%,#388697,transparent_40%)] pointer-events-none" />
        <div className="landing-particle left-[15%] top-[18%]" />
        <div className="landing-particle left-[65%] top-[25%]" />
        <div className="landing-particle left-[80%] top-[60%]" />

        {/* Top Brand Header */}
        <div className="relative z-10">
          {/* Logo Branding */}
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <img src="/L.png" alt="Libralink" className="h-9 w-9 object-contain transition-transform group-hover:scale-105" />
            <span className="text-xl font-bold tracking-tight text-white">Libralink</span>
          </Link>

          <div>
            <div className="inline-flex items-center gap-2 border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.16em] text-sky-200 backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7DD3FC] animate-ping" />
              Inter-Campus Library System
            </div>
          </div>

          <h1 className="mt-5 text-3xl xl:text-4xl font-semibold tracking-[-0.03em] leading-tight">
            Your library workspace, <br />
            <span className="text-[#7DD3FC]">seamlessly connected.</span>
          </h1>
          
          <p className="mt-3 text-sm leading-6 text-slate-200 max-w-lg">
            Manage catalogs, handle borrowing requests, and discover academic resources across connected campus branches.
          </p>
        </div>

        {/* Animated Picture Showcase in the center with p2.jpg */}
        <div className="relative z-10 my-auto py-6 flex items-center justify-center">
          <div className="relative w-full max-w-md">
            
            {/* Subtle animated glowing aura */}
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-sky-400/25 to-[#388697]/25 blur-xl animate-pulse" />
            
            {/* Main Image Frame */}
            <div className="relative border border-white/20 bg-white/10 p-2.5 backdrop-blur-md shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
              <img
                src="/p2.jpg"
                alt="Library workspace"
                className="w-full h-64 object-cover object-center filter brightness-95"
              />
              
              {/* Floating status pill 1 */}
              <div className="absolute -top-3 -right-3 flex items-center gap-2 border border-white/30 bg-[#0077B6] px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-lg animate-bounce" style={{ animationDuration: '3.5s' }}>
                <FiBookOpen className="w-3.5 h-3.5 text-[#7DD3FC]" />
                <span>Live Catalog Sync</span>
              </div>

              {/* Floating status pill 2 */}
              <div className="absolute -bottom-3 -left-3 flex items-center gap-2 border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[#0F172A] shadow-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Librarian Management</span>
              </div>
            </div>

          </div>
        </div>

        {/* Feature Checkpoints */}
        <div className="relative z-10 pt-4 border-t border-white/15 grid grid-cols-2 gap-4 text-xs text-slate-200">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[#7DD3FC]">
              <FiCheck className="w-3 h-3" />
            </span>
            <span>Unified Book Management</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[#7DD3FC]">
              <FiCheck className="w-3 h-3" />
            </span>
            <span>Fast Inter-School Requests</span>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Minimalist Form Panel like Librarian System (5 cols) */}
      <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 xl:p-14 bg-white min-h-screen">
        
        {/* Top bar on the right side: Mobile logo + Return to Home */}
        <div className="w-full max-w-sm mx-auto flex items-center justify-between lg:justify-end">
          <div className="flex items-center gap-2 lg:hidden">
            <img src="/L.png" alt="Libralink" className="h-7 w-7 object-contain" />
            <span className="text-sm font-bold text-[#0F172A]">Libralink</span>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0077B6] transition-colors py-1 group"
          >
            <FiArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Return to Home</span>
          </Link>
        </div>

        {/* Center Form */}
        <div className="w-full max-w-sm mx-auto my-auto py-6">
          
          {/* Form Header */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0077B6] mb-1.5">
              Sign In
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#0F172A]">
              Welcome back
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#64748B]">
              Enter your credentials to access the library portal.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 border-l-4 border-red-500 bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <FiShield className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-[.14em] text-[#64748B]">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="librarian@school.edu.ph"
                  value={form.email}
                  onChange={handleChange}
                  className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] pl-9 pr-3 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:bg-white focus:ring-1 focus:ring-[#0077B6]"
                  required
                />
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-[.14em] text-[#64748B]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-xs font-semibold text-[#0077B6] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] pl-9 pr-10 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:bg-white focus:ring-1 focus:ring-[#0077B6]"
                  required
                />
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#0077B6] px-4 text-xs font-semibold uppercase tracking-[.12em] text-white transition hover:bg-[#00669d] hover:shadow-md disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in to portal"}
              {!loading && <FiArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Helper Note */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-[#64748B]">
              Need an account or assistance?{" "}
              <span className="font-semibold text-[#0077B6]">
                Contact your library administrator
              </span>
            </p>
          </div>

        </div>

        {/* Bottom verification badge */}
        <div className="w-full max-w-sm mx-auto text-center pt-4">
          <div className="inline-flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <FiShield className="w-3.5 h-3.5 text-[#0077B6]" />
            <span>Secure & Verified Library Authentication</span>
          </div>
        </div>

      </div>

      {/* Clean Minimalist Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#0077B6]">
                  Password Recovery
                </p>
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-[#0F172A] mt-1">
                  {resetStep === 'success' ? 'Password Reset Complete' : resetStep === 'code' ? 'Enter Verification Code' : resetStep === 'password' ? 'Set New Password' : resetStep === 'choose_method' ? 'Recovery Method' : 'Find Your Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeForgotPassword}
                className="text-slate-400 hover:text-slate-700 p-1"
                aria-label="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <p className="mt-2 text-xs leading-5 text-[#64748B] sm:text-sm">
              {resetStep === 'success'
                ? 'Your password has been reset successfully. You can now sign in with your new password.'
                : resetStep === 'code'
                ? `We've sent a 6-digit verification code to your recovery email. Enter the code below to proceed.`
                : resetStep === 'password'
                ? 'Enter your new password below.'
                : resetStep === 'choose_method'
                ? 'Choose how you want to receive your password verification code.'
                : 'Search for your account by email or username.'
              }
            </p>

            {resetStep === 'find_account' && (
              <form onSubmit={handleFindAccount} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="reset-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-[.14em] text-[#64748B]">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:bg-white"
                  />
                </div>
                
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white text-slate-400 font-medium">OR</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="reset-username" className="mb-1.5 block text-xs font-semibold uppercase tracking-[.14em] text-[#64748B]">
                    Username
                  </label>
                  <input
                    id="reset-username"
                    type="text"
                    placeholder="your username"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:bg-white"
                  />
                </div>

                {resetError && (
                  <div className="border-l-4 border-red-500 bg-red-50 p-3">
                    <div className="flex items-start gap-2">
                      <FiShield className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-red-800">{resetError}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    className="flex-1 min-h-11 border border-slate-200 px-4 text-xs font-semibold text-[#64748B] transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading || (!resetEmail && !resetUsername)}
                    className="flex-1 min-h-11 bg-[#0077B6] px-4 text-xs font-semibold uppercase tracking-[.1em] text-white transition hover:bg-[#00669d] disabled:cursor-wait disabled:opacity-60"
                  >
                    {resetLoading ? 'Searching...' : 'Find Account'}
                  </button>
                </div>
              </form>
            )}

            {resetStep === 'choose_method' && (
              <div className="mt-5 space-y-4">
                <div className="bg-[#F8FAFC] border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0077B6] text-white flex items-center justify-center shrink-0">
                      <FiUser className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0F172A] text-sm truncate">{resetEmail}</p>
                      <p className="text-xs text-slate-500">Account verified</p>
                    </div>
                  </div>
                  {resetRecoveryEmail && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 text-xs text-slate-600">
                      <span className="text-slate-400">Code will be sent to: </span>
                      <strong className="text-[#0077B6] break-all">{resetRecoveryEmail}</strong>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="w-full min-h-11 border border-[#0077B6] bg-white px-4 text-xs font-semibold text-[#0077B6] transition hover:bg-[#0077B6]/5 disabled:cursor-wait disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <FiMail className="w-4 h-4" />
                  {resetLoading ? 'Sending...' : 'Send verification code'}
                </button>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setResetStep('find_account')}
                    className="flex-1 min-h-11 border border-slate-200 px-4 text-xs font-semibold text-[#64748B] transition hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    className="flex-1 min-h-11 border border-slate-200 px-4 text-xs font-semibold text-[#64748B] transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {resetStep === 'code' && (
              <form onSubmit={(e) => { e.preventDefault(); setResetStep('password'); }} className="mt-5 space-y-4">
                <div className="bg-[#E0F2FE] border border-[#BDE3F6] p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <FiMail className="w-4 h-4 text-[#0077B6]" />
                    <span className="text-xs font-semibold text-[#0077B6]">Code sent to:</span>
                  </div>
                  <p className="text-xs font-medium text-[#0F172A] break-all">{resetRecoveryEmail}</p>
                </div>

                <div>
                  <label htmlFor="reset-code" className="mb-1.5 block text-xs font-semibold uppercase tracking-[.14em] text-[#64748B]">
                    Verification Code
                  </label>
                  <input
                    id="reset-code"
                    type="text"
                    placeholder="123456"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] px-3 text-center text-lg font-mono tracking-widest outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:bg-white"
                    maxLength={6}
                    required
                  />
                </div>

                {resetError && (
                  <div className="border-l-4 border-red-500 bg-red-50 p-3">
                    <div className="flex items-start gap-2">
                      <FiShield className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-red-800">{resetError}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setResetStep('find_account')}
                    className="flex-1 min-h-11 border border-slate-200 px-4 text-xs font-semibold text-[#64748B] transition hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resetCode.length !== 6}
                    className="flex-1 min-h-11 bg-[#0077B6] px-4 text-xs font-semibold uppercase tracking-[.1em] text-white transition hover:bg-[#00669d] disabled:cursor-wait disabled:opacity-60"
                  >
                    Continue
                  </button>
                </div>
              </form>
            )}

            {resetStep === 'password' && (
              <form onSubmit={handleVerifyResetCode} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-[.14em] text-[#64748B]">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:bg-white"
                    minLength={8}
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Must be at least 8 characters long</p>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-[.14em] text-[#64748B]">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:bg-white"
                    minLength={8}
                    required
                  />
                </div>

                {resetError && (
                  <div className="border-l-4 border-red-500 bg-red-50 p-3">
                    <div className="flex items-start gap-2">
                      <FiShield className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-red-800">{resetError}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setResetStep('code')}
                    className="flex-1 min-h-11 border border-slate-200 px-4 text-xs font-semibold text-[#64748B] transition hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading || resetPassword.length < 8 || resetConfirmPassword.length < 8}
                    className="flex-1 min-h-11 bg-[#0077B6] px-4 text-xs font-semibold uppercase tracking-[.1em] text-white transition hover:bg-[#00669d] disabled:cursor-wait disabled:opacity-60"
                  >
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}

            {resetStep === 'success' && (
              <div className="mt-6 space-y-4">
                <button
                  onClick={closeForgotPassword}
                  className="w-full min-h-11 bg-[#0077B6] px-4 text-xs font-semibold uppercase tracking-[.1em] text-white transition hover:bg-[#00669d]"
                >
                  Done & Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
