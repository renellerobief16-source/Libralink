import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "../../utils/api";
import { FiMail, FiLock, FiArrowLeft, FiCheck, FiBook } from "react-icons/fi";

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
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
            Search the full catalog across every branch
          </li>
          <li className="flex items-start gap-3 text-white/90 text-base">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <FiCheck className="w-4 h-4" />
            </div>
            Get notified before a hold or due date slips by
          </li>
        </ul>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex min-h-[100dvh] items-center justify-center px-4 py-7 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 inline-flex min-h-11 items-center gap-2 text-[#64748B] hover:text-[#0077B6] transition-colors text-sm font-medium sm:mb-8">
            <FiArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          
          <div className="border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-center gap-3 mb-7 sm:mb-8">
              <img src="/L.png" alt="Libralink Logo" className="w-12 h-12 object-cover" />
              <div>
                <span className="text-xl font-bold text-[#0F172A]">Libralink</span>
                <p className="text-xs text-[#64748B]">Library Management System</p>
              </div>
            </div>
            
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A] mb-2">Sign in</h2>
            <p className="text-sm text-[#64748B] mb-6">Enter your details to access your account.</p>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#0F172A] mb-2">Email address</label>
                <div className="flex min-h-12 items-center gap-3 border border-[#E2E8F0] px-3 focus-within:border-[#0077B6] focus-within:ring-2 focus-within:ring-[#0077B6]/20 transition-all bg-[#F8FAFC]">
                  <FiMail className="w-5 h-5 text-[#64748B]" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@libralink.com"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                    className="min-w-0 flex-1 outline-none text-[#0F172A] placeholder-[#94A3B8] text-base sm:text-sm bg-transparent"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#0F172A] mb-2">Password</label>
                <div className="flex min-h-12 items-center gap-3 border border-[#E2E8F0] px-3 focus-within:border-[#0077B6] focus-within:ring-2 focus-within:ring-[#0077B6]/20 transition-all bg-[#F8FAFC]">
                  <FiLock className="w-5 h-5 text-[#64748B]" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    required
                    className="min-w-0 flex-1 outline-none text-[#0F172A] placeholder-[#94A3B8] text-base sm:text-sm bg-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <a href="#forgot" className="text-sm text-[#0077B6] hover:text-[#005f8f] font-medium">Forgot password?</a>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="min-h-12 w-full bg-[#0077B6] hover:bg-[#005f8f] disabled:bg-[#94A3B8] text-white py-3 font-semibold transition-all shadow-sm hover:shadow-md text-sm"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-[#E2E8F0]"></div>
              <span className="text-[#94A3B8] text-sm">or</span>
              <div className="flex-1 h-px bg-[#E2E8F0]"></div>
            </div>
            
            <p className="text-center text-[#64748B] text-sm">
              Contact your college administrator to register for an account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
