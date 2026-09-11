import { useState, useEffect } from "react";
import { 
  FiUsers, FiEdit, FiSearch, FiEye, FiX, FiBook, FiClock, 
  FiAlertTriangle, FiCheckCircle, FiPhone, FiMail, FiHash, FiCalendar,
  FiShield, FiUserCheck, FiBookOpen, FiRefreshCw, FiMapPin, FiLayers,
  FiAward, FiFilter, FiCheck, FiInfo
} from "react-icons/fi";
import api, { getBackendAssetUrl } from "../../../utils/api";
import Card from "../../ui/Card";
import StatusBadge from "../../ui/StatusBadge";
import EmptyState from "../../ui/EmptyState";
import { formatPhilippineDate, formatPhilippineDateTime, formatRelativeTime } from "../../../utils/timeUtils";

const ACADEMIC_LEVELS = [
  { id: "college", label: "College", shortLabel: "College", color: "blue" },
  { id: "shs", label: "Senior High School", shortLabel: "SHS", color: "purple" },
  { id: "jhs", label: "Junior High School", shortLabel: "JHS", color: "emerald" }
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

// Helper to determine student's academic level based on position, course, or student number
function detectAcademicLevel(student) {
  const pos = String(student?.position || '').toLowerCase();
  const idNum = String(student?.student_number || '').trim();

  if (
    pos.includes('senior high') || 
    pos.includes('shs') || 
    pos.includes('stem') || 
    pos.includes('abm') || 
    pos.includes('humss') || 
    pos.includes('gas') || 
    pos.includes('tvl')
  ) {
    return 'shs';
  }

  if (
    pos.includes('junior high') || 
    pos.includes('jhs') || 
    pos.includes('grade 7') || 
    pos.includes('grade 8') || 
    pos.includes('grade 9') || 
    pos.includes('grade 10')
  ) {
    return 'jhs';
  }

  if (
    pos.includes('bs ') || 
    pos.includes('bachelor') || 
    pos.includes('college') || 
    pos.includes('ab ') ||
    pos.includes('nursing') ||
    pos.includes('criminology') ||
    pos.includes('engineering') ||
    pos.includes('accountancy')
  ) {
    return 'college';
  }

  // Fallback by ID pattern: 12 digits usually DepEd LRN (SHS default unless specified)
  if (/^\d{12}$/.test(idNum)) {
    return 'shs';
  }

  return 'college';
}

function getLevelBadgeInfo(levelKey) {
  switch (levelKey) {
    case 'college':
      return {
        label: 'College',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        dotClass: 'bg-blue-500'
      };
    case 'shs':
      return {
        label: 'Senior High',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        dotClass: 'bg-purple-500'
      };
    case 'jhs':
      return {
        label: 'Junior High',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500'
      };
    default:
      return {
        label: 'Patron',
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-500'
      };
  }
}

function AdminListStudents() {
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [academicLevelFilter, setAcademicLevelFilter] = useState('all'); // 'all' | 'college' | 'shs' | 'jhs'

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [editLevel, setEditLevel] = useState('college');
  const [editForm, setEditForm] = useState({
    firstname: '',
    middle_name: '',
    lastname: '',
    student_number: '',
    position: '', // Course / Program / Grade
    gender: 'other',
    contact_number: '',
    address: '',
    email: '',
    status: 'active'
  });
  const [customCourseMode, setCustomCourseMode] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Borrower 360° Drawer state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentLoansLoading, setStudentLoansLoading] = useState(false);
  const [activeLoans, setActiveLoans] = useState([]);
  const [loanHistory, setLoanHistory] = useState([]);
  const [profileTab, setProfileTab] = useState('active'); // 'active' | 'history'

  const handleEditClick = (student) => {
    const detectedLevel = detectAcademicLevel(student);
    setEditLevel(detectedLevel);
    setEditingStudent(student);
    setSaveError('');
    setSaveSuccess(false);

    const currentPosition = student.position || '';
    
    // Check if currentPosition matches any known course in active structures
    const allCourses = [
      ...COLLEGE_DEPARTMENTS.flatMap(d => d.courses),
      ...SHS_TRACKS.flatMap(t => t.courses),
      ...JHS_CURRICULUM.flatMap(c => c.courses)
    ];

    const isPredefined = allCourses.includes(currentPosition);
    setCustomCourseMode(!isPredefined && !!currentPosition);

    setEditForm({
      firstname: student.firstname || '',
      middle_name: student.middle_name || '',
      lastname: student.lastname || '',
      student_number: student.student_number || '',
      position: currentPosition,
      gender: student.gender || 'other',
      contact_number: student.contact_number || '',
      address: student.address || '',
      email: student.email || '',
      status: student.status || 'active'
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.firstname.trim() || !editForm.lastname.trim()) {
      setSaveError('First Name and Last Name are required.');
      return;
    }

    setSaveLoading(true);
    setSaveError('');
    try {
      await api.put(`/users/${editingStudent.user_id}`, {
        firstname: editForm.firstname.trim(),
        middle_name: editForm.middle_name.trim() || null,
        lastname: editForm.lastname.trim(),
        student_number: editForm.student_number.trim() || null,
        position: editForm.position.trim() || null,
        gender: editForm.gender,
        contact_number: editForm.contact_number.trim() || null,
        address: editForm.address.trim() || null,
        email: editForm.email.trim(),
        status: editForm.status
      });

      setSaveSuccess(true);
      await fetchStudents();
      setTimeout(() => {
        setEditingStudent(null);
        setSaveSuccess(false);
      }, 700);
    } catch (error) {
      console.error('Error updating student:', error);
      setSaveError(error.response?.data?.message || 'Failed to update student record. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setSaveError('');
    setSaveSuccess(false);
  };

  // Open Borrower 360° Profile
  const handleOpenProfile = async (student) => {
    setSelectedStudent(student);
    setProfileTab('active');
    setStudentLoansLoading(true);
    try {
      const [activeRes, historyRes] = await Promise.all([
        api.get(`/borrow/student/${student.user_id}/active`).catch(() => ({ data: { data: [] } })),
        api.get(`/borrow/student/${student.user_id}/history`).catch(() => ({ data: { data: [] } }))
      ]);
      setActiveLoans(activeRes.data?.data || activeRes.data || []);
      setLoanHistory(historyRes.data?.data || historyRes.data || []);
    } catch (err) {
      console.error('Error loading student loans:', err);
      setActiveLoans([]);
      setLoanHistory([]);
    } finally {
      setStudentLoansLoading(false);
    }
  };

  const handleCloseProfile = () => {
    setSelectedStudent(null);
    setActiveLoans([]);
    setLoanHistory([]);
  };

  const fetchStudents = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      console.error('No schoolId found in localStorage');
      return;
    }

    setStudentsLoading(true);
    try {
      const response = await api.get(`/users/school/${schoolId}`);
      // Role ID 4 is Student in Libralink
      const studentList = (response.data || []).filter(u => {
        const role = String(u.role_name || u.role || '').toLowerCase();
        const roleId = Number(u.role_id || 0);
        // Exclude staff & admins
        if (roleId === 1 || roleId === 2 || roleId === 3) return false;
        if (role.includes('admin') || role.includes('librarian') || role.includes('staff')) return false;
        return roleId === 4 || role.includes('student') || (!roleId && !role);
      });
      setStudents(studentList);
      
      // Fetch school name
      const schoolResponse = await api.get(`/schools/${schoolId}`);
      setSchoolName(schoolResponse.data?.school_name || 'School');
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter logic
  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstname || ''} ${student.middle_name || ''} ${student.lastname || ''}`.toLowerCase();
    const matchesSearch = 
      !searchTerm ||
      fullName.includes(searchTerm.toLowerCase()) ||
      student.student_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.address?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && student.status !== 'inactive') ||
      (statusFilter === 'inactive' && student.status === 'inactive');

    const studentLevel = detectAcademicLevel(student);
    const matchesAcademicLevel = 
      academicLevelFilter === 'all' || academicLevelFilter === studentLevel;

    return matchesSearch && matchesStatus && matchesAcademicLevel;
  });

  const countByLevel = {
    all: students.length,
    college: students.filter(s => detectAcademicLevel(s) === 'college').length,
    shs: students.filter(s => detectAcademicLevel(s) === 'shs').length,
    jhs: students.filter(s => detectAcademicLevel(s) === 'jhs').length
  };

  const overdueStudentLoans = activeLoans.filter(loan => {
    if (!loan.due_date) return false;
    return new Date(loan.due_date) < new Date();
  });

  // Get course list options for Edit Modal according to editLevel
  const getCoursesForLevel = (lvl) => {
    if (lvl === 'college') return COLLEGE_DEPARTMENTS;
    if (lvl === 'shs') return SHS_TRACKS;
    if (lvl === 'jhs') return JHS_CURRICULUM;
    return [];
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Modern Academic Directory Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/10 mb-3">
              <FiBookOpen className="w-3.5 h-3.5 text-blue-300" />
              Institutional Patron Registry · {schoolName || 'Home Campus'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Student Borrowers Directory</h1>
            <p className="text-blue-200/80 text-sm mt-1 max-w-xl">
              Inspect student borrower accounts, filter by academic tier, review circulation standing, and view real-time loan ledgers with Philippine Standard Time precision.
            </p>
          </div>

          {/* Quick Metrics & PHT Indicator */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center min-w-[90px]">
              <div className="text-2xl font-black text-white">{students.length}</div>
              <div className="text-[11px] text-blue-200 font-medium">Total Borrowers</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center min-w-[90px]">
              <div className="text-2xl font-black text-blue-300">{countByLevel.college}</div>
              <div className="text-[11px] text-blue-200 font-medium">College</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center min-w-[90px]">
              <div className="text-2xl font-black text-purple-300">{countByLevel.shs}</div>
              <div className="text-[11px] text-blue-200 font-medium">Senior High</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center min-w-[90px]">
              <div className="text-2xl font-black text-emerald-300">{countByLevel.jhs}</div>
              <div className="text-[11px] text-blue-200 font-medium">Junior High</div>
            </div>
          </div>
        </div>
      </div>
      
      {studentsLoading ? (
        <Card>
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <span className="ml-3 text-sm text-slate-500 font-medium">Loading institutional borrower registry...</span>
          </div>
        </Card>
      ) : (
        <>
          {/* Dual Filtering & Search Toolbar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by full name, ID/LRN, course, address, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'all' 
                      ? 'bg-white text-blue-700 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Status ({students.length})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'active' 
                      ? 'bg-white text-emerald-700 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active ({students.filter(s => s.status !== 'inactive').length})
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'inactive' 
                      ? 'bg-white text-rose-700 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Inactive ({students.filter(s => s.status === 'inactive').length})
                </button>
              </div>
            </div>

            {/* Academic Level Category Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                <FiLayers className="w-3.5 h-3.5 text-slate-400" />
                Academic Level:
              </span>
              <button
                onClick={() => setAcademicLevelFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  academicLevelFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                All Levels
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${academicLevelFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {countByLevel.all}
                </span>
              </button>
              <button
                onClick={() => setAcademicLevelFilter('college')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  academicLevelFilter === 'college'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-blue-50/60 text-blue-700 hover:bg-blue-100/70 border border-blue-200/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                College Programs
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${academicLevelFilter === 'college' ? 'bg-white/20 text-white' : 'bg-blue-200/80 text-blue-800'}`}>
                  {countByLevel.college}
                </span>
              </button>
              <button
                onClick={() => setAcademicLevelFilter('shs')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  academicLevelFilter === 'shs'
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                    : 'bg-purple-50/60 text-purple-700 hover:bg-purple-100/70 border border-purple-200/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                Senior High School
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${academicLevelFilter === 'shs' ? 'bg-white/20 text-white' : 'bg-purple-200/80 text-purple-800'}`}>
                  {countByLevel.shs}
                </span>
              </button>
              <button
                onClick={() => setAcademicLevelFilter('jhs')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  academicLevelFilter === 'jhs'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                    : 'bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100/70 border border-emerald-200/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Junior High School
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${academicLevelFilter === 'jhs' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-800'}`}>
                  {countByLevel.jhs}
                </span>
              </button>
            </div>
          </div>

          {/* Students Directory Full-Information Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FiUsers className="w-4 h-4 text-blue-600" />
                  Institutional Student Directory
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {filteredStudents.length} of {students.length} student records
                  {academicLevelFilter !== 'all' && ` · Filtered by ${academicLevelFilter.toUpperCase()}`}
                </p>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <FiInfo className="w-3.5 h-3.5 text-blue-500" />
                <span>Click student name to view Borrower 360° Profile</span>
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center">
                <EmptyState
                  icon={<FiUsers className="w-12 h-12 text-slate-300 mx-auto mb-2" />}
                  title="No Students Found"
                  description={
                    searchTerm || academicLevelFilter !== 'all' || statusFilter !== 'all'
                      ? "No student borrowers match your current search and filter criteria." 
                      : "No registered students found for this institution."
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-wider bg-slate-50/90 border-b border-slate-200/80">
                      <th className="py-3.5 px-4 min-w-[220px]">Student / Borrower</th>
                      <th className="py-3.5 px-4 min-w-[180px]">Academic Level & Program</th>
                      <th className="py-3.5 px-4 min-w-[140px]">Student ID / LRN</th>
                      <th className="py-3.5 px-4 min-w-[190px]">Contact & Email</th>
                      <th className="py-3.5 px-4 min-w-[170px]">Residence / Address</th>
                      <th className="py-3.5 px-4 min-w-[120px]">Standing</th>
                      <th className="py-3.5 px-4 text-right min-w-[140px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredStudents.map((student) => {
                      const level = detectAcademicLevel(student);
                      const levelBadge = getLevelBadgeInfo(level);
                      const middleInitial = student.middle_name ? `${student.middle_name.trim().charAt(0).toUpperCase()}.` : '';
                      const formattedFullName = [student.firstname, middleInitial, student.lastname].filter(Boolean).join(' ');
                      const profileImgUrl = student.profile_image ? getBackendAssetUrl(student.profile_image) : null;

                      return (
                        <tr 
                          key={student.user_id} 
                          className="hover:bg-blue-50/40 transition-colors group"
                        >
                          {/* Borrower Avatar & Name */}
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleOpenProfile(student)}
                              className="flex items-center gap-3 text-left focus:outline-none group/avatar"
                            >
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs overflow-hidden border border-slate-200/60 group-hover/avatar:scale-105 transition-transform">
                                {profileImgUrl ? (
                                  <img 
                                    src={profileImgUrl} 
                                    alt={formattedFullName} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span>{student.firstname?.[0] || 'S'}{student.lastname?.[0] || ''}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block text-sm leading-tight truncate max-w-[180px]">
                                  {formattedFullName || student.email}
                                </span>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <span>@{student.username || student.firstname?.toLowerCase() || 'student'}</span>
                                  <span>·</span>
                                  <span className="capitalize text-slate-400">{student.gender || 'Not specified'}</span>
                                </span>
                              </div>
                            </button>
                          </td>

                          {/* Academic Level & Program */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${levelBadge.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${levelBadge.dotClass}`} />
                                {levelBadge.label}
                              </span>
                              <p className="text-xs font-semibold text-slate-800 line-clamp-1 max-w-[200px]" title={student.position || 'General Studies'}>
                                {student.position || 'General Academics / Unassigned'}
                              </p>
                            </div>
                          </td>

                          {/* Student ID / LRN */}
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                              <FiHash className="w-3.5 h-3.5 text-slate-400" />
                              <span>{student.student_number || '—'}</span>
                            </div>
                          </td>

                          {/* Contact & Email */}
                          <td className="py-3.5 px-4 text-slate-600 space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs truncate max-w-[200px]" title={student.email}>
                              <FiMail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              <span className="truncate">{student.email || '—'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <FiPhone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>{student.contact_number || 'No phone registered'}</span>
                            </div>
                          </td>

                          {/* Address */}
                          <td className="py-3.5 px-4 text-slate-600">
                            <div className="flex items-start gap-1.5 text-xs max-w-[180px]">
                              <FiMapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2 text-slate-600 text-[11px]" title={student.address || 'No address provided'}>
                                {student.address || '—'}
                              </span>
                            </div>
                          </td>

                          {/* Standing */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              student.status === 'inactive' 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              <FiCheckCircle className="w-3 h-3" />
                              {student.status === 'inactive' ? 'Inactive' : 'Good Standing'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenProfile(student)}
                                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                                title="Borrower 360° Profile"
                              >
                                <FiEye className="w-3.5 h-3.5" />
                                360° Profile
                              </button>
                              <button
                                onClick={() => handleEditClick(student)}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-colors shadow-xs"
                                title="Edit Student Record"
                              >
                                <FiEdit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TWO-GRID OVERLAY MODAL: Edit Student Record                              */}
      {/* ========================================================================= */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <FiEdit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Student Record</h3>
                  <p className="text-xs text-slate-500">
                    Updating academic profile and institutional records for <span className="font-semibold text-slate-700">{editingStudent.firstname} {editingStudent.lastname}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCancelEdit} 
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                title="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Two-Grid Layout */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Patron Identity & Profile Photo (4 Cols) */}
              <div className="lg:col-span-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 flex flex-col items-center text-center space-y-4">
                {/* Profile Photo Display */}
                <div className="relative group">
                  <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white font-extrabold text-3xl flex items-center justify-center shadow-lg shadow-blue-500/15 overflow-hidden border-4 border-white">
                    {editingStudent.profile_image ? (
                      <img 
                        src={getBackendAssetUrl(editingStudent.profile_image)} 
                        alt={`${editingStudent.firstname} ${editingStudent.lastname}`} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{editingStudent.firstname?.[0] || 'S'}{editingStudent.lastname?.[0] || ''}</span>
                    )}
                  </div>
                  <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${
                    editForm.status === 'inactive' ? 'bg-rose-500' : 'bg-emerald-500'
                  }`} />
                </div>

                <div className="space-y-1 w-full">
                  <h4 className="text-base font-bold text-slate-900 leading-tight">
                    {editForm.firstname || 'Student'} {editForm.middle_name ? `${editForm.middle_name} ` : ''}{editForm.lastname || ''}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {editForm.student_number || 'No ID assigned'}
                  </p>
                  <div className="pt-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      editForm.status === 'inactive'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      <FiCheckCircle className="w-3.5 h-3.5" />
                      {editForm.status === 'inactive' ? 'Inactive Account' : 'Active / Good Standing'}
                    </span>
                  </div>
                </div>

                {/* Profile Picture Policy Notice */}
                <div className="w-full bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 text-left">
                  <div className="flex items-start gap-2">
                    <FiShield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-900 leading-relaxed font-medium">
                      <strong className="block text-blue-950 mb-0.5">Patron Photo Policy:</strong>
                      Profile picture can only be modified directly by the student through their personal onboarding & profile settings.
                    </p>
                  </div>
                </div>

                {/* System Record Metadata */}
                <div className="w-full bg-white border border-slate-200/70 rounded-xl p-3 text-left space-y-2 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">User ID:</span>
                    <span className="font-mono font-bold text-slate-800">#{editingStudent.user_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Campus:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[120px]">{schoolName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registered:</span>
                    <span>{editingStudent.created_at ? formatPhilippineDate(editingStudent.created_at) : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Comprehensive Editable Form (8 Cols) */}
              <div className="lg:col-span-8 space-y-5">
                {saveError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                {saveSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                    <FiCheck className="w-4 h-4 flex-shrink-0" />
                    <span>Student record updated successfully! Closing...</span>
                  </div>
                )}

                {/* 1. Personal Names (3 columns) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Full Legal Name
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 mb-1 block">First Name *</span>
                      <input
                        type="text"
                        value={editForm.firstname}
                        onChange={(e) => setEditForm({...editForm, firstname: e.target.value})}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                        placeholder="e.g. Juan"
                        required
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 mb-1 block">Middle Name</span>
                      <input
                        type="text"
                        value={editForm.middle_name}
                        onChange={(e) => setEditForm({...editForm, middle_name: e.target.value})}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                        placeholder="e.g. Santos"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 mb-1 block">Last Name *</span>
                      <input
                        type="text"
                        value={editForm.lastname}
                        onChange={(e) => setEditForm({...editForm, lastname: e.target.value})}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                        placeholder="e.g. Dela Cruz"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Academic Level & Program Selector */}
                <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FiAward className="w-3.5 h-3.5 text-blue-600" />
                      Academic Level & Program
                    </label>
                    
                    {/* Level Tabs in Modal */}
                    <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg self-start">
                      {ACADEMIC_LEVELS.map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => {
                            setEditLevel(lvl.id);
                            // Set default course for that level if changing
                            const struct = getCoursesForLevel(lvl.id);
                            if (struct.length > 0 && struct[0].courses?.length > 0) {
                              setEditForm(prev => ({ ...prev, position: struct[0].courses[0] }));
                              setCustomCourseMode(false);
                            }
                          }}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                            editLevel === lvl.id
                              ? 'bg-white text-blue-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {lvl.shortLabel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Course Dropdown or Custom text */}
                  <div className="space-y-2">
                    {!customCourseMode ? (
                      <div>
                        <select
                          value={editForm.position}
                          onChange={(e) => {
                            if (e.target.value === '__CUSTOM__') {
                              setCustomCourseMode(true);
                              setEditForm(prev => ({ ...prev, position: '' }));
                            } else {
                              setEditForm(prev => ({ ...prev, position: e.target.value }));
                            }
                          }}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                        >
                          <option value="" disabled>-- Select Degree Program / Strand / Grade --</option>
                          {getCoursesForLevel(editLevel).map((group, gIdx) => (
                            <optgroup key={gIdx} label={group.name}>
                              {group.courses.map((courseName, cIdx) => (
                                <option key={cIdx} value={courseName}>
                                  {courseName}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                          <option value="__CUSTOM__">✏️ Custom Program / Other...</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">Custom Program / Grade description:</span>
                          <button
                            type="button"
                            onClick={() => setCustomCourseMode(false)}
                            className="text-[11px] text-blue-600 hover:underline"
                          >
                            Back to Standard List
                          </button>
                        </div>
                        <input
                          type="text"
                          value={editForm.position}
                          onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                          placeholder="e.g. BS in Information Systems"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Student Number / LRN & Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Student ID Number / LRN
                    </label>
                    <input
                      type="text"
                      value={editForm.student_number}
                      onChange={(e) => setEditForm({...editForm, student_number: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium text-slate-900"
                      placeholder={editLevel === 'college' ? 'e.g. 20-22252' : '12-digit DepEd LRN'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 capitalize"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other / Prefer not to say</option>
                    </select>
                  </div>
                </div>

                {/* 4. Contact Details: Phone & Institutional Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Contact Cellphone Number
                    </label>
                    <input
                      type="text"
                      value={editForm.contact_number}
                      onChange={(e) => setEditForm({...editForm, contact_number: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                      placeholder="e.g. 09171234567"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Institutional Email Address
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                      placeholder="e.g. student@school.edu.ph"
                    />
                  </div>
                </div>

                {/* 5. Address & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Residence / Complete Address
                    </label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                      placeholder="e.g. Brgy. San Jose, Antipolo City, Rizal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Account Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                    >
                      <option value="active">Active (Good Standing)</option>
                      <option value="inactive">Inactive / Suspended</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Changes take effect across institutional records immediately.
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saveLoading}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saveLoading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saveLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Records...</span>
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Borrower 360° Drawer / Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-scale-up overflow-hidden">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0 overflow-hidden border-2 border-white">
                  {selectedStudent.profile_image ? (
                    <img 
                      src={getBackendAssetUrl(selectedStudent.profile_image)} 
                      alt={selectedStudent.firstname} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span>{selectedStudent.firstname?.[0] || 'S'}{selectedStudent.lastname?.[0] || ''}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectedStudent.firstname} {selectedStudent.middle_name ? `${selectedStudent.middle_name} ` : ''}{selectedStudent.lastname}
                    </h3>
                    <StatusBadge status={selectedStudent.status || 'active'} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <FiHash className="w-3.5 h-3.5 text-slate-400" />
                      {selectedStudent.student_number || 'No ID'}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <FiMail className="w-3.5 h-3.5 text-slate-400" />
                      {selectedStudent.email || 'No email'}
                    </span>
                    {selectedStudent.contact_number && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <FiPhone className="w-3.5 h-3.5 text-slate-400" />
                          {selectedStudent.contact_number}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseProfile}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Standing & Quick Metrics */}
            <div className="p-6 pb-4 border-b border-slate-100">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50">
                  <span className="text-xs text-blue-600 font-semibold block">Active Loans</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {studentLoansLoading ? '...' : activeLoans.length}
                  </span>
                </div>
                <div className={`p-3.5 rounded-xl border ${overdueStudentLoans.length > 0 ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200 bg-slate-50'}`}>
                  <span className={`text-xs font-semibold block ${overdueStudentLoans.length > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    Overdue Items
                  </span>
                  <span className={`text-2xl font-bold ${overdueStudentLoans.length > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                    {studentLoansLoading ? '...' : overdueStudentLoans.length}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
                  <span className="text-xs text-emerald-700 font-semibold block">Standing</span>
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 mt-1.5">
                    {overdueStudentLoans.length > 0 ? (
                      <span className="text-rose-600">Action Required</span>
                    ) : (
                      <>
                        <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        In Good Standing
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Sub-tab switcher */}
              <div className="flex items-center gap-2 mt-5 border-b border-slate-200 pb-0">
                <button
                  onClick={() => setProfileTab('active')}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                    profileTab === 'active'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FiBook className="w-3.5 h-3.5" />
                  Currently Borrowed ({activeLoans.length})
                </button>
                <button
                  onClick={() => setProfileTab('history')}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                    profileTab === 'history'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FiClock className="w-3.5 h-3.5" />
                  Borrowing History ({loanHistory.length})
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto flex-1 max-h-96">
              {studentLoansLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-xs text-slate-500">Retrieving loan ledger...</span>
                </div>
              ) : profileTab === 'active' ? (
                activeLoans.length === 0 ? (
                  <div className="text-center py-8">
                    <FiCheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No Active Loans</p>
                    <p className="text-xs text-slate-400 mt-0.5">This student currently has no books checked out.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeLoans.map((loan) => {
                      const book = loan.book_copies?.books || {};
                      const isOverdue = loan.due_date && new Date(loan.due_date) < new Date();
                      return (
                        <div 
                          key={loan.borrow_id || loan.id} 
                          className={`p-4 rounded-xl border transition-all ${
                            isOverdue ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                {book.title || loan.book_title || 'Book Title'}
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                ISBN: {book.isbn || '—'} · Accession: {loan.book_copies?.accession_number || loan.accession_number || '—'}
                              </p>
                            </div>
                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                              isOverdue ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {isOverdue ? 'Overdue' : 'Active Loan'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 mt-3 pt-2.5 border-t border-slate-200/60 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                              Borrowed: {loan.borrow_date ? `${formatPhilippineDate(loan.borrow_date)} (${formatRelativeTime(loan.borrow_date)})` : '—'}
                            </span>
                            <span className={`flex items-center gap-1 font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                              <FiClock className="w-3.5 h-3.5" />
                              Due: {loan.due_date ? formatPhilippineDate(loan.due_date) : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                loanHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <FiClock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No Past History</p>
                    <p className="text-xs text-slate-400 mt-0.5">No returned transaction records found for this student.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {loanHistory.map((hist) => (
                      <div key={hist.borrow_id || hist.id} className="p-3.5 rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-900">
                            {hist.book_copies?.books?.title || hist.book_title || 'Book Loan'}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-600 uppercase">
                            {hist.status || 'Returned'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>Borrowed: {hist.borrow_date ? formatPhilippineDate(hist.borrow_date) : '—'}</span>
                          <span>Returned: {hist.return_date ? `${formatPhilippineDate(hist.return_date)} (${formatRelativeTime(hist.return_date)})` : '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button
                onClick={() => {
                  handleCloseProfile();
                  handleEditClick(selectedStudent);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-white transition-colors"
              >
                Edit Student Data
              </button>
              <button
                onClick={handleCloseProfile}
                className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminListStudents;
