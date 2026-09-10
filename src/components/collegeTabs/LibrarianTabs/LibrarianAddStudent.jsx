import { useState, useEffect } from "react";
import { 
  FiUser, FiMail, FiLock, FiPhone, FiArrowRight, FiUsers, 
  FiCheckCircle, FiAlertCircle, FiEye, FiEyeOff, FiHash, 
  FiBriefcase, FiBookOpen, FiShield, FiRefreshCw 
} from "react-icons/fi";
import { signUp } from "../../../utils/api";
import api from "../../../utils/api";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";

const DEPARTMENTS = [
  {
    name: "College of Computer Studies",
    courses: ["BS Information Technology", "BS Computer Science", "BS Information Systems"]
  },
  {
    name: "College of Business & Accountancy",
    courses: ["BS Accountancy", "BS Business Administration - Marketing", "BS Business Administration - Financial Mgt", "BS Hospitality Management"]
  },
  {
    name: "College of Engineering & Technology",
    courses: ["BS Civil Engineering", "BS Electrical Engineering", "BS Mechanical Engineering", "BS Industrial Engineering"]
  },
  {
    name: "College of Education, Arts & Sciences",
    courses: ["Bachelor of Secondary Education", "Bachelor of Elementary Education", "BA Communication", "BS Psychology"]
  },
  {
    name: "College of Health & Allied Sciences",
    courses: ["BS Nursing", "BS Pharmacy", "BS Medical Technology", "BS Physical Therapy"]
  },
  {
    name: "College of Criminal Justice Education",
    courses: ["BS Criminology", "BS Forensic Science"]
  }
];

function AdminAddStudent({ darkMode, onNavigateTab }) {
  const [registerForm, setRegisterForm] = useState({
    firstname: "",
    lastname: "",
    student_number: "",
    contact_number: "",
    email: "",
    department: DEPARTMENTS[0].name,
    course: DEPARTMENTS[0].courses[0],
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registeredStudent, setRegisteredStudent] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState({ id: null, name: 'Library Institution', code: 'SRC' });

  useEffect(() => {
    const schoolId = localStorage.getItem('schoolId');
    if (schoolId) {
      api.get(`/schools/${schoolId}`)
        .then(res => {
          if (res.data) {
            setSchoolInfo({
              id: schoolId,
              name: res.data.school_name || 'Library Institution',
              code: res.data.school_code || 'SRC'
            });
          }
        })
        .catch(err => console.warn('Could not fetch school details:', err));
    }
  }, []);

  // When department changes, update course to first option
  const handleDepartmentChange = (deptName) => {
    const dept = DEPARTMENTS.find(d => d.name === deptName);
    setRegisterForm(prev => ({
      ...prev,
      department: deptName,
      course: dept ? dept.courses[0] : ""
    }));
  };

  const selectedDeptObj = DEPARTMENTS.find(d => d.name === registerForm.department) || DEPARTMENTS[0];

  const validateForm = () => {
    const errors = {};
    
    if (!registerForm.firstname.trim()) {
      errors.firstname = 'First name is required';
    }
    
    if (!registerForm.lastname.trim()) {
      errors.lastname = 'Last name is required';
    }
    
    if (!registerForm.student_number.trim()) {
      errors.student_number = 'Student ID number is required';
    }
    
    if (!registerForm.contact_number.trim()) {
      errors.contact_number = 'Contact phone number is required';
    } else if (!/^[0-9+\-\s()]+$/.test(registerForm.contact_number)) {
      errors.contact_number = 'Invalid phone number format';
    }
    
    if (!registerForm.email.trim()) {
      errors.email = 'Institutional email is required';
    } else if (!/\S+@\S+\.\S+/.test(registerForm.email)) {
      errors.email = 'Invalid email address';
    }
    
    if (!registerForm.password) {
      errors.password = 'Password is required';
    } else if (registerForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (!registerForm.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    return errors;
  };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError("");
    setRegisteredStudent(null);

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setRegisterError(firstError);
      setRegisterLoading(false);
      return;
    }

    try {
      // Libralink roles: Super Admin = 1, Librarian Admin = 2, Librarian = 3, Student = 4
      const { data, error: signUpError } = await signUp(
        registerForm.email,
        registerForm.password,
        {
          role_id: 4,
          firstname: registerForm.firstname.trim(),
          lastname: registerForm.lastname.trim(),
          student_number: registerForm.student_number.trim(),
          contact_number: registerForm.contact_number.trim(),
          department: registerForm.department,
          course: registerForm.course,
        }
      );

      if (signUpError) throw signUpError;

      setRegisteredStudent({
        name: `${registerForm.firstname} ${registerForm.lastname}`,
        student_number: registerForm.student_number,
        email: registerForm.email,
        course: registerForm.course
      });

      // Clear form
      setRegisterForm({
        firstname: "",
        lastname: "",
        student_number: "",
        contact_number: "",
        email: "",
        department: DEPARTMENTS[0].name,
        course: DEPARTMENTS[0].courses[0],
        password: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error('Registration failed:', err);
      setRegisterError(err.message || "Student registration failed. Please verify user uniqueness.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const resetFormToNew = () => {
    setRegisteredStudent(null);
    setRegisterError("");
    setRegisterForm({
      firstname: "",
      lastname: "",
      student_number: "",
      contact_number: "",
      email: "",
      department: DEPARTMENTS[0].name,
      course: DEPARTMENTS[0].courses[0],
      password: "",
      confirmPassword: "",
    });
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Modern Academic Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/10 mb-3">
              <FiShield className="w-3.5 h-3.5 text-emerald-300" />
              Verified Patron Onboarding · {schoolInfo.name}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Register New Student Borrower</h1>
            <p className="text-blue-200/80 text-sm mt-1 max-w-xl">
              Enroll institutional students into the library catalog. Registered students instantly gain borrowing privileges and campus circulation access.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-3 self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-blue-500/30 text-white flex items-center justify-center font-black text-sm">
              {schoolInfo.code}
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Assigned Campus</p>
              <p className="text-sm font-bold text-white leading-tight">{schoolInfo.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {registeredStudent && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm animate-scale-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">Student Borrower Registered Successfully!</h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  <strong>{registeredStudent.name}</strong> ({registeredStudent.student_number}) is now registered under {registeredStudent.course}.
                </p>
                <p className="text-[11px] text-emerald-600 mt-1 font-mono">
                  Login Credentials: {registeredStudent.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={resetFormToNew}
                className="bg-white hover:bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-semibold"
              >
                <FiRefreshCw className="w-3.5 h-3.5 mr-1" />
                Register Another
              </Button>
              {onNavigateTab && (
                <Button
                  size="sm"
                  onClick={() => onNavigateTab('list-students')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  View in Directory
                  <FiArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {registerError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <FiAlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-rose-900">Registration Notice</h4>
            <p className="text-xs text-rose-700 mt-0.5">{registerError}</p>
          </div>
        </div>
      )}

      {/* Registration Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        <form 
          onSubmit={handleRegisterStudent} 
          autoComplete="off" 
          className="space-y-6"
          data-lpignore="true"
        >
          {/* Section: Personal Identity */}
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FiUser className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Student Identity & Name
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="student_reg_fname">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="student_reg_fname"
                  name="student_first_name"
                  type="text"
                  placeholder="e.g. Maria"
                  value={registerForm.firstname}
                  onChange={(e) => setRegisterForm({...registerForm, firstname: e.target.value})}
                  required
                  autoComplete="off"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="student_reg_lname">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="student_reg_lname"
                  name="student_last_name"
                  type="text"
                  placeholder="e.g. Santos"
                  value={registerForm.lastname}
                  onChange={(e) => setRegisterForm({...registerForm, lastname: e.target.value})}
                  required
                  autoComplete="off"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section: Academic Classification & ID */}
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FiBriefcase className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Academic Unit & Institutional ID
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="student_reg_id">
                  Student ID Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FiHash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="student_reg_id"
                    name="student_id_code"
                    type="text"
                    placeholder="e.g. 2026-00123 or SRC-2026-1042"
                    value={registerForm.student_number}
                    onChange={(e) => setRegisterForm({...registerForm, student_number: e.target.value})}
                    required
                    autoComplete="off"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Official ID printed on school identification card</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="student_reg_contact">
                  Contact Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="student_reg_contact"
                    name="student_contact_phone"
                    type="tel"
                    placeholder="0912 345 6789"
                    value={registerForm.contact_number}
                    onChange={(e) => setRegisterForm({...registerForm, contact_number: e.target.value})}
                    required
                    autoComplete="off"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Department Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  College / Academic Department
                </label>
                <select
                  value={registerForm.department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {DEPARTMENTS.map((dept, idx) => (
                    <option key={idx} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              {/* Course / Program Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Course / Degree Program
                </label>
                <select
                  value={registerForm.course}
                  onChange={(e) => setRegisterForm({...registerForm, course: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {selectedDeptObj.courses.map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section: Account & Password Credentials */}
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FiLock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Authentication & Portal Credentials
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="student_reg_portal_email">
                  Student Institutional Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="student_reg_portal_email"
                    name="student_patron_email_address"
                    type="email"
                    placeholder="student@school.edu.ph"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                    required
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">This email will be used by the student to sign in and receive hold notices</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Create Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="student_reg_new_pwd">
                    Create Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="student_reg_new_pwd"
                      name="student_temporary_pwd"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full px-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="student_reg_confirm_pwd">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="student_reg_confirm_pwd"
                      name="student_temporary_confirm_pwd"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-type password"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full px-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Action Controls */}
          <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetFormToNew}
              className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Reset Fields
            </button>
            <Button
              type="submit"
              disabled={registerLoading}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all"
            >
              {registerLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Student Account...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Complete Registration
                  <FiArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminAddStudent;
