import { useState, useEffect } from "react";
import { 
  FiUser, FiMail, FiLock, FiPhone, FiArrowRight, FiUsers, 
  FiCheckCircle, FiAlertCircle, FiEye, FiEyeOff, FiHash, 
  FiBriefcase, FiBookOpen, FiShield, FiRefreshCw,
  FiCopy, FiCheck, FiX, FiUserCheck, FiPrinter, FiSend, FiAward, FiMapPin
} from "react-icons/fi";
import { signUp } from "../../../utils/api";
import api from "../../../utils/api";
import Button from "../../ui/Button";

const ACADEMIC_LEVELS = [
  { 
    id: "college", 
    label: "College", 
    idType: "Student Number", 
    idPlaceholder: "20-22252", 
    idDescription: "Standard 2-digit entry year followed by 5 digits (YY-NNNNN)"
  },
  { 
    id: "shs", 
    label: "Senior High School", 
    idType: "Learner Reference Number (LRN)", 
    idPlaceholder: "12-digit DepEd LRN (e.g. 109283746501)", 
    idDescription: "12-digit unique national DepEd Learner Reference Number"
  },
  { 
    id: "jhs", 
    label: "Junior High School", 
    idType: "Learner Reference Number (LRN)", 
    idPlaceholder: "12-digit DepEd LRN (e.g. 109283746501)", 
    idDescription: "12-digit unique national DepEd Learner Reference Number"
  }
];

const COLLEGE_DEPARTMENTS = [
  {
    name: "College of Computer Studies",
    courses: ["BS Information Technology", "BS Computer Science", "BS Information Systems"]
  },
  {
    name: "College of Business & Accountancy",
    courses: ["BS Business Administration", "BS Accountancy", "BS Management Accounting"]
  },
  {
    name: "College of Education, Arts & Sciences",
    courses: ["Bachelor of Secondary Education", "Bachelor of Elementary Education", "AB Communication", "BS Psychology"]
  },
  {
    name: "College of Engineering & Architecture",
    courses: ["BS Civil Engineering", "BS Computer Engineering", "BS Electrical Engineering", "BS Architecture"]
  },
  {
    name: "College of Nursing & Allied Health",
    courses: ["BS Nursing", "BS Medical Technology", "BS Pharmacy"]
  },
  {
    name: "College of Hospitality & Tourism",
    courses: ["BS Hospitality Management", "BS Tourism Management"]
  },
  {
    name: "College of Criminology",
    courses: ["BS Criminology"]
  }
];

const SHS_TRACKS = [
  {
    name: "Academic Track",
    courses: [
      "STEM (Science, Technology, Engineering & Mathematics)",
      "ABM (Accountancy, Business & Management)",
      "HUMSS (Humanities & Social Sciences)",
      "GAS (General Academic Strand)"
    ]
  },
  {
    name: "Technical-Vocational-Livelihood (TVL) Track",
    courses: [
      "TVL - Information & Communications Technology (ICT)",
      "TVL - Home Economics (HE)",
      "TVL - Industrial Arts"
    ]
  }
];

const JHS_CURRICULUM = [
  {
    name: "Junior High Curriculum",
    courses: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"]
  }
];

function AdminAddStudent({ darkMode, onNavigateTab }) {
  const [academicLevel, setAcademicLevel] = useState("college");
  const [pinSuffix, setPinSuffix] = useState(() => Math.floor(1000 + Math.random() * 9000));
  
  const [registerForm, setRegisterForm] = useState({
    firstname: "",
    middle_name: "",
    lastname: "",
    student_number: "",
    contact_number: "",
    address: "",
    personal_email: "",
    department: COLLEGE_DEPARTMENTS[0].name,
    course: COLLEGE_DEPARTMENTS[0].courses[0],
    customPassword: "",
  });

  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [sendCredentialsToGmail, setSendCredentialsToGmail] = useState(true);
  const [registeredStudent, setRegisteredStudent] = useState(null);
  const [copiedField, setCopiedField] = useState("");
  const [schoolInfo, setSchoolInfo] = useState({ id: null, name: 'Library Institution', code: 'SRC' });

  // Get active departments/tracks based on level
  const activeStructure = academicLevel === "college" 
    ? COLLEGE_DEPARTMENTS 
    : (academicLevel === "shs" ? SHS_TRACKS : JHS_CURRICULUM);

  const selectedStructureObj = activeStructure.find(d => d.name === registerForm.department) || activeStructure[0];

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

  // Switch academic level and adapt departments/courses
  const handleAcademicLevelChange = (levelId) => {
    setAcademicLevel(levelId);
    setRegisterError("");
    const newStructure = levelId === "college" 
      ? COLLEGE_DEPARTMENTS 
      : (levelId === "shs" ? SHS_TRACKS : JHS_CURRICULUM);

    setRegisterForm(prev => ({
      ...prev,
      student_number: "",
      department: newStructure[0].name,
      course: newStructure[0].courses[0]
    }));
  };

  // Handle department change within active level
  const handleDepartmentChange = (deptName) => {
    const dept = activeStructure.find(d => d.name === deptName);
    setRegisterForm(prev => ({
      ...prev,
      department: deptName,
      course: dept ? dept.courses[0] : ""
    }));
  };

  // Auto-formatted Student ID / LRN Handler
  const handleIdChange = (e) => {
    let val = e.target.value;

    if (academicLevel === "college") {
      // College Student ID: 20-22252 format (2 digits, dash, 5 digits)
      val = val.replace(/[^0-9]/g, '');
      if (val.length > 7) val = val.slice(0, 7);
      if (val.length > 2) {
        val = `${val.slice(0, 2)}-${val.slice(2)}`;
      }
    } else {
      // SHS & JHS LRN: 12 numeric digits
      val = val.replace(/[^0-9]/g, '');
      if (val.length > 12) val = val.slice(0, 12);
    }

    setRegisterForm(prev => ({ ...prev, student_number: val }));
  };

  // Computed Auto Credentials
  const cleanFirst = registerForm.firstname.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLast = registerForm.lastname.toLowerCase().replace(/[^a-z0-9]/g, '');
  const autoPortalEmail = (cleanFirst && cleanLast)
    ? `${cleanFirst}.${cleanLast}@libralink.com`
    : (cleanFirst || cleanLast ? `${cleanFirst || cleanLast}@libralink.com` : "student.name@libralink.com");

  const formattedLastName = registerForm.lastname.trim()
    ? (registerForm.lastname.trim().charAt(0).toUpperCase() + registerForm.lastname.trim().slice(1).toLowerCase().replace(/[^a-zA-Z]/g, ''))
    : "Student";
  const autoPassword = registerForm.customPassword.trim() || `${formattedLastName}${pinSuffix}`;

  const regeneratePin = () => {
    setPinSuffix(Math.floor(1000 + Math.random() * 9000));
  };

  const handleCopyText = (text, fieldKey) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(""), 2200);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!registerForm.firstname.trim()) {
      errors.firstname = 'First name is required';
    }
    
    if (!registerForm.lastname.trim()) {
      errors.lastname = 'Last name is required';
    }
    
    if (!registerForm.student_number.trim()) {
      errors.student_number = academicLevel === "college" 
        ? 'Student Number is required (Format: 20-22252)' 
        : '12-digit Learner Reference Number (LRN) is required';
    } else if (academicLevel === "college" && !/^\d{2}-\d{5}$/.test(registerForm.student_number.trim())) {
      errors.student_number = 'College Student Number must follow the format 20-22252 (2 digits, hyphen, 5 digits)';
    } else if ((academicLevel === "shs" || academicLevel === "jhs") && !/^\d{12}$/.test(registerForm.student_number.trim())) {
      errors.student_number = 'DepEd LRN must be exactly 12 numeric digits';
    }
    
    if (!registerForm.contact_number.trim()) {
      errors.contact_number = 'Contact phone number is required';
    } else if (!/^[0-9+\-\s()]+$/.test(registerForm.contact_number)) {
      errors.contact_number = 'Invalid phone number format';
    }

    if (!registerForm.address.trim()) {
      errors.address = 'Residential home address is required';
    }

    if (registerForm.personal_email.trim() && !/\S+@\S+\.\S+/.test(registerForm.personal_email.trim())) {
      errors.personal_email = 'Invalid student Gmail/Email address format';
    }
    
    return errors;
  };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError("");

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setRegisterError(firstError);
      setRegisterLoading(false);
      return;
    }

    const finalPortalEmail = autoPortalEmail;
    const finalPassword = autoPassword;
    const activeLevelLabel = academicLevel === 'college' 
      ? 'College' 
      : (academicLevel === 'shs' ? 'Senior High School' : 'Junior High School');

    const formattedStudentName = [
      registerForm.firstname.trim(),
      registerForm.middle_name.trim(),
      registerForm.lastname.trim()
    ].filter(Boolean).join(' ');

    try {
      // Register through Libralink auth endpoint
      const { data, error: signUpError } = await signUp(
        finalPortalEmail,
        finalPassword,
        {
          role_id: 4,
          firstname: registerForm.firstname.trim(),
          middle_name: registerForm.middle_name.trim(),
          lastname: registerForm.lastname.trim(),
          student_number: registerForm.student_number.trim(),
          contact_number: registerForm.contact_number.trim(),
          address: registerForm.address.trim(),
          personal_email: registerForm.personal_email.trim(),
          send_email_credentials: sendCredentialsToGmail,
          academic_level: activeLevelLabel,
          department: registerForm.department,
          course: registerForm.course,
        }
      );

      if (signUpError) throw signUpError;

      const emailDispatched = sendCredentialsToGmail && !!registerForm.personal_email.trim() && data?.emailSent !== false;

      setRegisteredStudent({
        name: formattedStudentName,
        firstname: registerForm.firstname.trim(),
        middle_name: registerForm.middle_name.trim(),
        lastname: registerForm.lastname.trim(),
        student_number: registerForm.student_number.trim(),
        portal_email: finalPortalEmail,
        temporary_password: finalPassword,
        personal_email: registerForm.personal_email.trim(),
        address: registerForm.address.trim(),
        academic_level: activeLevelLabel,
        course: registerForm.course,
        department: registerForm.department,
        contact_number: registerForm.contact_number.trim(),
        school_name: schoolInfo.name,
        school_code: schoolInfo.code,
        email_sent: emailDispatched,
        email_skipped: !sendCredentialsToGmail || !registerForm.personal_email.trim()
      });

      // Reset form to clean state for next student
      setRegisterForm({
        firstname: "",
        middle_name: "",
        lastname: "",
        student_number: "",
        contact_number: "",
        address: "",
        personal_email: "",
        department: activeStructure[0].name,
        course: activeStructure[0].courses[0],
        customPassword: "",
      });
      setPinSuffix(Math.floor(1000 + Math.random() * 9000));
    } catch (err) {
      console.error('Registration failed:', err);
      setRegisterError(err.message || "Student registration failed. Please verify uniqueness of credentials.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const resetFormToNew = () => {
    setRegisteredStudent(null);
    setRegisterError("");
    setRegisterForm({
      firstname: "",
      middle_name: "",
      lastname: "",
      student_number: "",
      contact_number: "",
      address: "",
      personal_email: "",
      department: activeStructure[0].name,
      course: activeStructure[0].courses[0],
      customPassword: "",
    });
    setPinSuffix(Math.floor(1000 + Math.random() * 9000));
  };

  const handlePrintSlip = () => {
    if (!registeredStudent) return;
    const printWindow = window.open('', '_blank', 'width=700,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Borrower Pass - ${registeredStudent.name}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 30px;
            color: #1e293b;
            background: #fff;
          }
          .pass-card {
            border: 2px solid #0284c7;
            border-radius: 16px;
            padding: 24px;
            max-width: 550px;
            margin: 0 auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .badge {
            background: #0284c7;
            color: #fff;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .school-title {
            font-size: 14px;
            font-weight: 800;
            color: #0369a1;
          }
          .pass-type {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
          }
          .student-name {
            font-size: 22px;
            font-weight: 900;
            margin: 0 0 6px 0;
            color: #0f172a;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin: 16px 0;
            background: #f8fafc;
            padding: 14px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          .info-item {
            font-size: 12px;
          }
          .info-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            display: block;
          }
          .info-val {
            font-weight: 700;
            color: #1e293b;
          }
          .full-width {
            grid-column: span 2;
          }
          .credentials {
            border: 1.5px dashed #0284c7;
            background: #f0f9ff;
            border-radius: 12px;
            padding: 14px;
            margin-top: 16px;
          }
          .cred-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0369a1;
            margin-bottom: 8px;
          }
          .barcode {
            text-align: center;
            margin-top: 20px;
            letter-spacing: 5px;
            font-family: monospace;
            font-weight: 900;
            color: #475569;
          }
          .footer-note {
            font-size: 10px;
            text-align: center;
            color: #94a3b8;
            margin-top: 14px;
          }
        </style>
      </head>
      <body>
        <div class="pass-card">
          <div class="header">
            <div>
              <div class="pass-type">Institutional Library Pass</div>
              <div class="school-title">${registeredStudent.school_name} (${registeredStudent.school_code})</div>
            </div>
            <div class="badge">${registeredStudent.academic_level}</div>
          </div>

          <h1 class="student-name">${registeredStudent.name}</h1>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">${registeredStudent.academic_level === 'College' ? 'Student ID' : 'DepEd LRN'}</span>
              <span class="info-val">${registeredStudent.student_number}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Contact Phone</span>
              <span class="info-val">${registeredStudent.contact_number}</span>
            </div>
            <div class="info-item full-width">
              <span class="info-label">Course / Program</span>
              <span class="info-val">${registeredStudent.course} (${registeredStudent.department})</span>
            </div>
            <div class="info-item full-width">
              <span class="info-label">Residential Address</span>
              <span class="info-val">${registeredStudent.address || 'N/A'}</span>
            </div>
          </div>

          <div class="credentials">
            <div class="cred-title">Libralink Official Portal Credentials</div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <div><strong>Username:</strong> <code style="color:#0369a1;">${registeredStudent.portal_email}</code></div>
              <div><strong>Initial Password:</strong> <code style="color:#059669;">${registeredStudent.temporary_password}</code></div>
            </div>
          </div>

          <div class="barcode">
            ||| | ||| || |||| | ||| || | |||<br>
            <span style="font-size: 11px; letter-spacing: 2px;">${registeredStudent.student_number}</span>
          </div>

          <div class="footer-note">
            Official borrower pass issued on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Please present at the circulation counter to borrow physical books.
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const currentLevelConfig = ACADEMIC_LEVELS.find(l => l.id === academicLevel);

  return (
    <div className="animate-slide-up space-y-6">
      {/* Modern Academic Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/10 mb-3">
              <FiShield className="w-3.5 h-3.5 text-emerald-300" />
              Patron Onboarding Studio · {schoolInfo.name}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Register New Student Borrower</h1>
            <p className="text-blue-200/80 text-sm mt-1 max-w-xl">
              Enroll College students or High School / Senior High learners into the library system. Institutional portal logins and temporary passwords are created and dispatched automatically.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-3 self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-blue-500/30 text-white flex items-center justify-center font-black text-sm">
              {schoolInfo.code}
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Active Campus</p>
              <p className="text-sm font-bold text-white leading-tight">{schoolInfo.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Level Segmented Switcher */}
      <div className={`p-2 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-center gap-2 ${
        darkMode ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200/80"
      }`}>
        <span className={`text-xs font-bold uppercase tracking-wider px-3 ${
          darkMode ? "text-slate-400" : "text-slate-500"
        }`}>
          Academic Level:
        </span>
        <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto flex-1">
          {ACADEMIC_LEVELS.map((level) => {
            const isActive = academicLevel === level.id;
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => handleAcademicLevelChange(level.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : darkMode
                      ? "text-slate-300 hover:bg-slate-700/60"
                      : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{level.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {registerError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 animate-slide-up">
          <FiAlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-rose-900">Registration Notice</h4>
            <p className="text-xs text-rose-700 mt-0.5">{registerError}</p>
          </div>
        </div>
      )}

      {/* Registration Form Card */}
      <div className={`rounded-3xl border shadow-sm p-6 sm:p-8 transition-colors ${
        darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200/90"
      }`}>
        <form 
          onSubmit={handleRegisterStudent} 
          autoComplete="off" 
          className="space-y-7"
          data-lpignore="true"
        >
          {/* Section 1: Student Identity */}
          <div>
            <div className={`flex items-center gap-2 pb-3 mb-4 border-b ${
              darkMode ? "border-slate-700" : "border-slate-100"
            }`}>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FiUser className="w-4 h-4" />
              </div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${
                darkMode ? "text-slate-300" : "text-slate-900"
              }`}>
                1. Student Patron Identity
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${
                  darkMode ? "text-slate-300" : "text-slate-700"
                }`} htmlFor="student_reg_fname">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="student_reg_fname"
                  name="student_first_name"
                  type="text"
                  placeholder="e.g. Juan"
                  value={registerForm.firstname}
                  onChange={(e) => setRegisterForm({...registerForm, firstname: e.target.value})}
                  required
                  autoComplete="off"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? "bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900" 
                      : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${
                  darkMode ? "text-slate-300" : "text-slate-700"
                }`} htmlFor="student_reg_mname">
                  Middle Name <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                </label>
                <input
                  id="student_reg_mname"
                  name="student_middle_name"
                  type="text"
                  placeholder="e.g. Protacio"
                  value={registerForm.middle_name}
                  onChange={(e) => setRegisterForm({...registerForm, middle_name: e.target.value})}
                  autoComplete="off"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? "bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900" 
                      : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${
                  darkMode ? "text-slate-300" : "text-slate-700"
                }`} htmlFor="student_reg_lname">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="student_reg_lname"
                  name="student_last_name"
                  type="text"
                  placeholder="e.g. Dela Cruz"
                  value={registerForm.lastname}
                  onChange={(e) => setRegisterForm({...registerForm, lastname: e.target.value})}
                  required
                  autoComplete="off"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? "bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900" 
                      : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white"
                  }`}
                />
              </div>
            </div>

            {/* Residential Address (Required) */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${
                darkMode ? "text-slate-300" : "text-slate-700"
              }`} htmlFor="student_reg_address">
                Residential Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="student_reg_address"
                  name="student_address"
                  type="text"
                  placeholder="e.g. 123 Rizal Street, San Agustin, Santa Rita, Pampanga"
                  value={registerForm.address}
                  onChange={(e) => setRegisterForm({...registerForm, address: e.target.value})}
                  required
                  autoComplete="off"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? "bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900" 
                      : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white"
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Official home address for library registration records and circulation notices</p>
            </div>
          </div>

          {/* Section 2: Academic Classification & ID */}
          <div>
            <div className={`flex items-center gap-2 pb-3 mb-4 border-b ${
              darkMode ? "border-slate-700" : "border-slate-100"
            }`}>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FiBriefcase className="w-4 h-4" />
              </div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${
                darkMode ? "text-slate-300" : "text-slate-900"
              }`}>
                2. Academic Unit & {currentLevelConfig?.idType}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dynamic ID Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-semibold ${
                    darkMode ? "text-slate-300" : "text-slate-700"
                  }`} htmlFor="student_reg_id">
                    {currentLevelConfig?.idType} <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-blue-500 font-bold">
                    {academicLevel === "college" ? "Format: 20-22252" : "12-Digit LRN"}
                  </span>
                </div>
                <div className="relative">
                  <FiHash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="student_reg_id"
                    name="student_id_code"
                    type="text"
                    placeholder={currentLevelConfig?.idPlaceholder}
                    value={registerForm.student_number}
                    onChange={handleIdChange}
                    required
                    autoComplete="off"
                    maxLength={academicLevel === "college" ? 8 : 12}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? "bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900" 
                        : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white"
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{currentLevelConfig?.idDescription}</p>
              </div>

              {/* Student Phone Number */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${
                  darkMode ? "text-slate-300" : "text-slate-700"
                }`} htmlFor="student_reg_contact">
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
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? "bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900" 
                        : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white"
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">For urgent circulation and overdue SMS notices</p>
              </div>

              {/* Department / Track Selector */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${
                  darkMode ? "text-slate-300" : "text-slate-700"
                }`}>
                  {academicLevel === "college" ? "College Department" : (academicLevel === "shs" ? "Academic Track" : "Curriculum Track")}
                </label>
                <select
                  value={registerForm.department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? "bg-slate-900/60 border border-slate-700 text-white focus:bg-slate-900" 
                      : "bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                  }`}
                >
                  {activeStructure.map((dept, idx) => (
                    <option key={idx} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              {/* Course / Program / Grade Selector */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${
                  darkMode ? "text-slate-300" : "text-slate-700"
                }`}>
                  {academicLevel === "college" ? "Degree Program" : (academicLevel === "shs" ? "Senior High Strand" : "Grade Level")}
                </label>
                <select
                  value={registerForm.course}
                  onChange={(e) => setRegisterForm({...registerForm, course: e.target.value})}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? "bg-slate-900/60 border border-slate-700 text-white focus:bg-slate-900" 
                      : "bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white"
                  }`}
                >
                  {selectedStructureObj.courses.map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Automated Authentication & Gmail Delivery */}
          <div>
            <div className={`flex items-center gap-2 pb-3 mb-4 border-b ${
              darkMode ? "border-slate-700" : "border-slate-100"
            }`}>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FiLock className="w-4 h-4" />
              </div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${
                darkMode ? "text-slate-300" : "text-slate-900"
              }`}>
                3. Automated Authentication & Gmail Delivery
              </h3>
            </div>

            <div className="space-y-4">
              {/* Student Personal Gmail */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-semibold ${
                    darkMode ? "text-slate-300" : "text-slate-700"
                  }`} htmlFor="email">
                    Student's Personal Gmail / Active Email <span className="text-slate-400 font-normal text-[11px] ml-1">(Optional)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Quick complete:</span>
                </div>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="e.g. juan.delacruz@gmail.com"
                    value={registerForm.personal_email}
                    onChange={(e) => setRegisterForm({...registerForm, personal_email: e.target.value})}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      darkMode 
                        ? "bg-slate-900/60 border border-emerald-500/30 text-white placeholder-slate-500 focus:bg-slate-900" 
                        : "bg-emerald-50/40 border border-emerald-200 text-slate-900 placeholder-slate-400 focus:bg-white"
                    }`}
                  />
                </div>

                {/* Smart Domain Autocomplete Chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className={`text-[11px] font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Tap to append:
                  </span>
                  {["@gmail.com", "@yahoo.com", "@outlook.com"].map((domain) => (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => {
                        const currentVal = registerForm.personal_email.trim();
                        if (!currentVal) return;
                        const prefix = currentVal.includes('@') ? currentVal.split('@')[0] : currentVal;
                        setRegisterForm(prev => ({ ...prev, personal_email: `${prefix}${domain}` }));
                      }}
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border transition-all ${
                        darkMode 
                          ? "bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700" 
                          : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 shadow-xs"
                      }`}
                    >
                      +{domain}
                    </button>
                  ))}
                </div>

                {/* Optional Gmail Delivery Toggle */}
                <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  darkMode ? "bg-slate-900/60 border-slate-700/80" : "bg-white border-slate-200 shadow-xs"
                }`}>
                  <label htmlFor="toggle-gmail-send" className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      id="toggle-gmail-send"
                      type="checkbox"
                      checked={sendCredentialsToGmail}
                      onChange={(e) => setSendCredentialsToGmail(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                    <div>
                      <span className={`text-xs font-bold block ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                        Send credentials and Libralink portal link to student's Gmail
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Includes temporary password and one-click portal login link
                      </span>
                    </div>
                  </label>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    sendCredentialsToGmail 
                      ? (darkMode ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-emerald-100 text-emerald-800 border border-emerald-300")
                      : (darkMode ? "bg-slate-800 text-slate-400 border border-slate-700" : "bg-slate-200 text-slate-600 border border-slate-300")
                  }`}>
                    {sendCredentialsToGmail ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <p className={`text-[11px] mt-2 flex items-center gap-1.5 ${
                  sendCredentialsToGmail && registerForm.personal_email.trim()
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-400"
                }`}>
                  <FiSend className="w-3 h-3" />
                  {sendCredentialsToGmail && registerForm.personal_email.trim()
                    ? `Ready to dispatch credentials and login link to ${registerForm.personal_email.trim()}`
                    : "Gmail sending is optional. Credentials are generated live and ready on screen and printed slip."}
                </p>
              </div>

              {/* Automatic Credentials Preview Card */}
              <div className={`p-4 rounded-2xl border transition-all ${
                darkMode 
                  ? "bg-slate-900/80 border-slate-700 shadow-inner" 
                  : "bg-slate-50 border-slate-200/90 shadow-sm"
              }`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${
                      darkMode ? "text-emerald-400" : "text-emerald-700"
                    }`}>
                      Live Generated Portal Credentials
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={regeneratePin}
                    className={`text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                      darkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
                    }`}
                    title="Generate new random 4-digit PIN"
                  >
                    <FiRefreshCw className="w-3 h-3" />
                    Regenerate PIN
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Generated Email */}
                  <div className={`p-3 rounded-xl border ${
                    darkMode ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200"
                  }`}>
                    <span className={`text-[10px] font-bold uppercase ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Institutional Portal Username
                    </span>
                    <p className="font-mono text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 truncate mt-0.5 select-all">
                      {autoPortalEmail}
                    </p>
                  </div>

                  {/* Generated Password */}
                  <div className={`p-3 rounded-xl border ${
                    darkMode ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200"
                  }`}>
                    <span className={`text-[10px] font-bold uppercase ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Temporary Initial Password
                    </span>
                    <p className="font-mono text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate mt-0.5 select-all">
                      {autoPassword}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Action Controls */}
          <div className={`pt-4 border-t flex flex-col-reverse sm:flex-row items-center justify-end gap-3 ${
            darkMode ? "border-slate-700" : "border-slate-100"
          }`}>
            <button
              type="button"
              onClick={resetFormToNew}
              className={`w-full sm:w-auto px-5 py-2.5 border text-xs font-bold rounded-xl transition-colors ${
                darkMode 
                  ? "border-slate-700 text-slate-300 hover:bg-slate-700" 
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Reset Fields
            </button>
            <Button
              type="submit"
              disabled={registerLoading}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition-all"
            >
              {registerLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Student & Sending Email...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Complete Registration & Dispatch
                  <FiArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* ========================================================= */}
      {/* CELEBRATORY ANIMATED OVERLAY MODAL                         */}
      {/* ========================================================= */}
      {registeredStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
          
          {/* Confetti / Particle Embellishments */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-10 left-1/4 w-3 h-3 bg-emerald-400 rounded-full animate-bounce opacity-80" />
            <div className="absolute top-20 right-1/4 w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse opacity-70" />
            <div className="absolute top-1/3 left-10 w-3 h-3 bg-amber-400 rotate-45 animate-ping opacity-60" />
            <div className="absolute bottom-20 right-10 w-3 h-3 bg-teal-400 rounded-full animate-bounce opacity-70" />
            <div className="absolute top-16 right-1/3 w-4 h-1.5 bg-indigo-400 rotate-12 animate-pulse opacity-75" />
          </div>

          <div className={`relative w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 animate-scale-up ${
            darkMode 
              ? "bg-slate-900 border-slate-700 text-slate-100" 
              : "bg-white border-slate-200 text-slate-900"
          }`}>
            
            {/* Modal Ambient Glow */}
            <div className="absolute -right-16 -top-16 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className={`p-6 border-b flex items-start justify-between relative z-10 ${
              darkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/80"
            }`}>
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <FiCheckCircle className="w-6 h-6" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-extrabold tracking-tight">
                      Student Registered Successfully!
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      Active Patron
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Official borrower account created and circulation rights granted.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRegisteredStudent(null)}
                className={`p-2 rounded-xl transition-colors ${
                  darkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                }`}
                title="Close overlay"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Digital Library Pass */}
            <div className="p-6 sm:p-7 space-y-6 relative z-10">
              
              {/* Digital Library Card Badge */}
              <div className={`p-5 rounded-2xl border relative overflow-hidden transition-all shadow-md ${
                darkMode 
                  ? "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700" 
                  : "bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-white border-blue-200/80"
              }`}>
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                      {registeredStudent.school_code}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                        Library Pass
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none">
                        {registeredStudent.school_name}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-600 text-white tracking-wider">
                    {registeredStudent.academic_level}
                  </span>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      {registeredStudent.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {registeredStudent.academic_level === 'College' ? 'ID: ' : 'LRN: '}{registeredStudent.student_number}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        • {registeredStudent.course}
                      </span>
                    </div>
                    {registeredStudent.address && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <FiMapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        <span className="truncate max-w-sm">{registeredStudent.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Barcode Visual Strip */}
                  <div className="flex flex-col items-center sm:items-end">
                    <div className="font-mono text-[10px] tracking-[3px] text-slate-400 font-bold">
                      ||| | ||| || |||| | |||
                    </div>
                    <span className="font-mono text-[9px] text-slate-400 tracking-wider">
                      {registeredStudent.student_number}
                    </span>
                  </div>
                </div>
              </div>

              {/* Portal Credentials Section */}
              <div className={`p-4 rounded-2xl border ${
                darkMode ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Generated Authentication Credentials
                  </span>
                  
                  {/* Gmail Delivery Pill */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    registeredStudent.email_sent 
                      ? (darkMode ? "bg-emerald-950/80 text-emerald-300 border-emerald-800" : "bg-emerald-100 text-emerald-700 border-emerald-300")
                      : (darkMode ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-300")
                  }`}>
                    <FiSend className="w-3 h-3" />
                    {registeredStudent.email_sent 
                      ? "Dispatched to Gmail" 
                      : (registeredStudent.email_skipped ? "Delivery Skipped (Optional)" : "Email Queued")}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Portal Username */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                        <FiMail className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Portal Username</span>
                        <p className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {registeredStudent.portal_email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyText(registeredStudent.portal_email, "email")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        copiedField === "email"
                          ? "bg-emerald-600 text-white"
                          : darkMode
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {copiedField === "email" ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                      <span>{copiedField === "email" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {/* Temporary Password */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <FiLock className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Temporary Password</span>
                        <p className="font-mono text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                          {registeredStudent.temporary_password}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyText(registeredStudent.temporary_password, "password")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        copiedField === "password"
                          ? "bg-emerald-600 text-white"
                          : darkMode
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {copiedField === "password" ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                      <span>{copiedField === "password" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500">
                  <FiSend className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  {registeredStudent.personal_email && registeredStudent.email_sent ? (
                    <span className="truncate">Sent to student's inbox: <strong>{registeredStudent.personal_email}</strong></span>
                  ) : (
                    <span className="truncate">Account active in Libralink system. Ready for circulation and physical slip printing.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className={`p-5 sm:p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10 ${
              darkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/80"
            }`}>
              <button
                type="button"
                onClick={handlePrintSlip}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  darkMode 
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800" 
                    : "border-slate-300 text-slate-700 hover:bg-white"
                }`}
              >
                <FiPrinter className="w-3.5 h-3.5" />
                Print Borrower Slip
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={resetFormToNew}
                  className={`flex-1 sm:flex-none text-xs font-bold rounded-xl ${
                    darkMode ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <FiRefreshCw className="w-3.5 h-3.5 mr-1" />
                  Register Another
                </Button>

                {onNavigateTab && (
                  <Button
                    size="sm"
                    onClick={() => onNavigateTab('list-students')}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20"
                  >
                    View Directory
                    <FiArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAddStudent;
