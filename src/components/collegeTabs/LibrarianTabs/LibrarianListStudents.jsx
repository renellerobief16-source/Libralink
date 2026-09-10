import { useState, useEffect } from "react";
import { 
  FiUsers, FiEdit, FiSearch, FiEye, FiX, FiBook, FiClock, 
  FiAlertTriangle, FiCheckCircle, FiPhone, FiMail, FiHash, FiCalendar,
  FiShield, FiUserCheck, FiBookOpen, FiRefreshCw
} from "react-icons/fi";
import api from "../../../utils/api";
import Card from "../../ui/Card";
import StatusBadge from "../../ui/StatusBadge";
import EmptyState from "../../ui/EmptyState";
import Input from "../../ui/Input";
import { formatPhilippineDate, formatPhilippineDateTime, formatRelativeTime, formatDateTimeWithRelative } from "../../../utils/timeUtils";

function AdminListStudents() {
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    firstname: '',
    lastname: '',
    student_number: '',
    gender: '',
    contact_number: '',
    email: ''
  });

  // Borrower 360° Drawer state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentLoansLoading, setStudentLoansLoading] = useState(false);
  const [activeLoans, setActiveLoans] = useState([]);
  const [loanHistory, setLoanHistory] = useState([]);
  const [profileTab, setProfileTab] = useState('active'); // 'active' | 'history'

  const handleEditClick = (student) => {
    setEditingStudent(student);
    setEditForm({
      firstname: student.firstname,
      lastname: student.lastname,
      student_number: student.student_number,
      gender: student.gender,
      contact_number: student.contact_number,
      email: student.email
    });
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/users/${editingStudent.user_id}`, editForm);
      await fetchStudents();
      setEditingStudent(null);
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setEditForm({
      firstname: '',
      lastname: '',
      student_number: '',
      gender: '',
      contact_number: '',
      email: ''
    });
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

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      !searchTerm ||
      student.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && student.status !== 'inactive') ||
      (statusFilter === 'inactive' && student.status === 'inactive');

    return matchesSearch && matchesStatus;
  });

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
      // Super Admin = 1, Librarian Admin = 2, Librarian = 3, Student = 4
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

  const overdueStudentLoans = activeLoans.filter(loan => {
    if (!loan.due_date) return false;
    return new Date(loan.due_date) < new Date();
  });

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
              Inspect student borrower accounts, review circulation standing, and view real-time loan ledgers with Philippine Standard Time precision.
            </p>
          </div>

          {/* Quick Metrics & PHT Indicator */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center min-w-[100px]">
              <div className="text-2xl font-black text-white">{students.length}</div>
              <div className="text-[11px] text-blue-200 font-medium">Borrowers</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center min-w-[100px]">
              <div className="text-2xl font-black text-emerald-300">
                {students.filter(s => s.status !== 'inactive').length}
              </div>
              <div className="text-[11px] text-blue-200 font-medium">Good Standing</div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-md text-[11px] text-blue-200 border border-white/10 self-start md:self-auto">
              <FiClock className="w-3.5 h-3.5 text-amber-300" />
              <span>PHT (UTC+8)</span>
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
          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search students by name, student ID number, or institutional email..."
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

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'all' 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({students.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'active' 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({students.filter(s => s.status !== 'inactive').length})
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'inactive' 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inactive ({students.filter(s => s.status === 'inactive').length})
              </button>
            </div>
          </div>

          {/* Edit Modal */}
          {editingStudent && (
            <div className="bg-white border-2 border-blue-500 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Student Record</h3>
                  <p className="text-xs text-slate-500">Updating institutional profile for {editingStudent.firstname} {editingStudent.lastname}</p>
                </div>
                <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600 p-1">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="First Name"
                  value={editForm.firstname}
                  onChange={(e) => setEditForm({...editForm, firstname: e.target.value})}
                />
                <Input
                  label="Last Name"
                  value={editForm.lastname}
                  onChange={(e) => setEditForm({...editForm, lastname: e.target.value})}
                />
                <Input
                  label="Student Number"
                  value={editForm.student_number}
                  onChange={(e) => setEditForm({...editForm, student_number: e.target.value})}
                />
                <Input
                  label="Contact Number"
                  value={editForm.contact_number}
                  onChange={(e) => setEditForm({...editForm, contact_number: e.target.value})}
                />
                <Input
                  label="Email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Students Directory Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registered Students</h3>
                <p className="text-xs text-slate-500 mt-0.5">Showing {filteredStudents.length} of {students.length} student records</p>
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center">
                <EmptyState
                  icon={<FiUsers className="w-12 h-12 text-slate-300 mx-auto mb-2" />}
                  title="No Students Found"
                  description={searchTerm ? "No student borrowers match your current search terms." : "No registered students found for this institution."}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-wider bg-slate-50/90 border-b border-slate-200/80">
                      <th className="py-3 px-4">Borrower / Student</th>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Standing</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredStudents.map((student) => (
                      <tr 
                        key={student.user_id} 
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleOpenProfile(student)}
                            className="flex items-center gap-3 text-left focus:outline-none"
                          >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                              {student.firstname?.[0] || 'S'}{student.lastname?.[0] || ''}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block text-sm">
                                {student.firstname} {student.lastname}
                              </span>
                              <span className="text-[11px] text-slate-400">View Borrower 360°</span>
                            </div>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px]">
                            {student.student_number || '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {student.email || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {student.contact_number || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            student.status === 'inactive' 
                              ? 'bg-slate-100 text-slate-600' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            <FiCheckCircle className="w-3 h-3" />
                            {student.status === 'inactive' ? 'Inactive' : 'Good Standing'}
                          </span>
                        </td>
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
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                              title="Edit Student Info"
                            >
                              <FiEdit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Borrower 360° Drawer / Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-scale-up overflow-hidden">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                  {selectedStudent.firstname?.[0] || 'S'}{selectedStudent.lastname?.[0] || ''}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectedStudent.firstname} {selectedStudent.lastname}
                    </h3>
                    <StatusBadge status={selectedStudent.status || 'active'} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
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
