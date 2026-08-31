import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "../../utils/api";
import { FiMail, FiLock, FiArrowLeft, FiCheck, FiBook, FiEye, FiEyeOff, FiShield } from "react-icons/fi";

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
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetStep, setResetStep] = useState('email'); // email, code, password, success

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (response.ok) {
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

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/auth/reset-password`, {
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
    setResetStep('email');
    setResetSuccess(false);
    setResetError("");
    setResetCode("");
    setResetPassword("");
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setResetEmail("");
    setResetCode("");
    setResetPassword("");
    setResetStep('email');
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
    <div className="min-h-[100dvh] bg-[#F8FAFC] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(480px,0.9fr)]">
      {/* LEFT — brand panel */}
      <div className="relative hidden overflow-hidden bg-[#023E8A] p-10 text-white lg:flex lg:flex-col lg:justify-center xl:p-16">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_75%_20%,#7DD3FC,transparent_28%),radial-gradient(circle_at_15%_85%,#388697,transparent_32%)]" />
        <div className="relative flex items-center gap-3 mb-8">
          <img src="/L.png" alt="Libralink Logo" className="w-12 h-12 object-cover" />
          <span className="text-xl font-bold tracking-wide">Libralink</span>
        </div>
        <h1 className="relative text-3xl lg:text-4xl font-semibold tracking-[-0.03em] mb-4">Welcome back to the library.</h1>
        <p className="relative text-base leading-7 text-white/80 mb-8">Sign in to access your account and manage your books.</p>
        <div className="relative mb-8">
          <img src="/student.png" alt="Student studying in the library" className="w-full max-w-md mx-auto object-cover" />
        </div>
        <ul className="relative space-y-4">
          <li className="flex items-start gap-3 text-white/90 text-base">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <FiCheck className="w-4 h-4" />
            </div>
            Track every title you've borrowed, reserved, or returned
          </li>
          <li className="flex items-start gap-3 text-white/90 text-base">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <FiCheck className="w-4 h-4" />
            </div>
            Discover books from connected libraries
          </li>
          <li className="flex items-start gap-3 text-white/90 text-base">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <FiCheck className="w-4 h-4" />
            </div>
            Manage your borrowing requests in one place
          </li>
        </ul>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex items-center justify-center px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center gap-3 lg:hidden sm:mb-8">
              <img src="/L.png" alt="Libralink Logo" className="h-9 w-9 object-contain sm:h-10 sm:w-10" />
              <span className="text-base font-semibold text-[#0F172A] sm:text-lg">Libralink</span>
            </div>

            <div className="border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
              <h2 className="text-xl font-semibold tracking-[-.02em] text-[#0F172A] sm:text-2xl">Sign in to your account</h2>
              <p className="mt-1.5 text-sm text-[#64748B] sm:mt-2">Enter your credentials to access the library system.</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:min-h-12 sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={handleChange}
                      className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:min-h-12 sm:text-base"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 sm:right-3 sm:p-2"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div></div>
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-sm font-semibold text-[#0077B6] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div className="border-l-4 border-red-500 bg-red-50 p-3 sm:p-4">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="min-h-11 w-full bg-[#0077B6] px-4 text-xs font-semibold text-white transition hover:bg-[#00669d] disabled:cursor-wait disabled:opacity-60 sm:min-h-12 sm:text-sm"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-5 text-center text-sm text-[#64748B] sm:mt-6">
                Don't have an account?{" "}
                <a href="#" className="font-semibold text-[#0077B6] hover:underline">
                  Contact your library
                </a>
              </div>
            </div>

            <div className="mt-5 text-center text-xs text-[#64748B] sm:mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </div>
          </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full sm:p-8">
            <h3 className="text-xl font-bold text-[#0F172A] mb-2 sm:text-2xl">
              {resetStep === 'success' ? 'Password Reset' : resetStep === 'code' ? 'Enter Verification Code' : resetStep === 'password' ? 'Set New Password' : 'Reset your password'}
            </h3>
            <p className="text-sm text-[#64748B] mb-6 sm:text-base">
              {resetStep === 'success'
                ? 'Your password has been reset successfully. You can now sign in with your new password.'
                : resetStep === 'code'
                ? `We've sent a 6-digit verification code to ${resetEmail}. Enter the code below to reset your password.`
                : resetStep === 'password'
                ? 'Enter your new password below.'
                : 'Enter your recovery email address and we\'ll send you a verification code to reset your password.'
              }
            </p>

            {resetStep === 'email' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="mb-2 block text-sm font-medium">Recovery email address</label>
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:min-h-12 sm:text-base"
                    required
                  />
                </div>

                {resetError && (
                  <div className="border-l-4 border-red-500 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-800">{resetError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    className="flex-1 min-h-11 border border-slate-200 px-4 text-sm font-semibold text-[#64748B] transition hover:bg-slate-50 sm:min-h-12"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 min-h-11 bg-[#0077B6] px-4 text-sm font-semibold text-white transition hover:bg-[#00669d] disabled:cursor-wait disabled:opacity-60 sm:min-h-12"
                  >
                    {resetLoading ? 'Sending...' : 'Send Code'}
                  </button>
                </div>
              </form>
            )}

            {resetStep === 'code' && (
              <form onSubmit={(e) => { e.preventDefault(); setResetStep('password'); }} className="space-y-4">
                <div>
                  <label htmlFor="reset-code" className="mb-2 block text-sm font-medium">Verification Code</label>
                  <input
                    id="reset-code"
                    type="text"
                    placeholder="123456"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] px-3 text-center text-lg font-mono tracking-widest outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:min-h-12"
                    maxLength={6}
                    required
                  />
                </div>

                {resetError && (
                  <div className="border-l-4 border-red-500 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-800">{resetError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setResetStep('email')}
                    className="flex-1 min-h-11 border border-slate-200 px-4 text-sm font-semibold text-[#64748B] transition hover:bg-slate-50 sm:min-h-12"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resetCode.length !== 6}
                    className="flex-1 min-h-11 bg-[#0077B6] px-4 text-sm font-semibold text-white transition hover:bg-[#00669d] disabled:cursor-wait disabled:opacity-60 sm:min-h-12"
                  >
                    Continue
                  </button>
                </div>
              </form>
            )}

            {resetStep === 'password' && (
              <form onSubmit={handleVerifyResetCode} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="mb-2 block text-sm font-medium">New Password</label>
                  <input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:min-h-12 sm:text-base"
                    minLength={8}
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">Must be at least 8 characters long</p>
                </div>

                {resetError && (
                  <div className="border-l-4 border-red-500 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-800">{resetError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setResetStep('code')}
                    className="flex-1 min-h-11 border border-slate-200 px-4 text-sm font-semibold text-[#64748B] transition hover:bg-slate-50 sm:min-h-12"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading || resetPassword.length < 8}
                    className="flex-1 min-h-11 bg-[#0077B6] px-4 text-sm font-semibold text-white transition hover:bg-[#00669d] disabled:cursor-wait disabled:opacity-60 sm:min-h-12"
                  >
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}

            {resetStep === 'success' && (
              <div className="space-y-4">
                <button
                  onClick={closeForgotPassword}
                  className="w-full min-h-11 bg-[#0077B6] px-4 text-sm font-semibold text-white transition hover:bg-[#00669d] sm:min-h-12"
                >
                  Done
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
