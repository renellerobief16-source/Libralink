import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FiPlus, 
  FiSearch, 
  FiEdit3, 
  FiTrash2, 
  FiFilter, 
  FiUsers, 
  FiUser, 
  FiShield, 
  FiCheckCircle, 
  FiList, 
  FiGrid, 
  FiMail, 
  FiPhone, 
  FiHash, 
  FiX, 
  FiChevronLeft, 
  FiChevronRight, 
  FiChevronsLeft, 
  FiChevronsRight, 
  FiActivity,
  FiAlertCircle,
  FiBookOpen,
  FiUserCheck,
  FiLock,
  FiCheck,
  FiCamera,
  FiUploadCloud,
  FiEye,
  FiEyeOff,
  FiLayers,
  FiMapPin,
  FiBriefcase
} from 'react-icons/fi';
import api, { getBackendAssetUrl } from '../../../utils/api';

// Utility helper for deterministic colorful avatar gradients
const getAvatarGradient = (name = '') => {
  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

function LibrarianAdminAddLibrarian() {
  const [activeTab, setActiveTab] = useState('students'); // 'students' or 'librarians'
  const [students, setStudents] = useState([]);
  const [librarians, setLibrarians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Form states
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    employee_number: '',
    student_number: '',
    contact_number: '',
    gender: '',
    position: '',
    department: '',
    year_level: '',
    address: '',
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const fileInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const schoolId = localStorage.getItem('schoolId');

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    fetchStudents();
    fetchLibrarians();
    fetchSchoolInfo();
  }, [schoolId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/school/${schoolId}?role_id=4`);
      setStudents(response.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLibrarians = async () => {
    try {
      const response = await api.get(`/users/school/${schoolId}?role_id=3`);
      setLibrarians(response.data || []);
    } catch (error) {
      console.error('Error fetching librarians:', error);
    }
  };

  const fetchSchoolInfo = async () => {
    try {
      const response = await api.get(`/schools/${schoolId}`);
      setSchoolInfo(response.data);
    } catch (error) {
      console.error('Error fetching school info:', error);
    }
  };

  const handleImageSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, JPEG, WebP)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit', 'error');
      return;
    }
    setProfileImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddUser = async (e) => {
    if (e) e.preventDefault();
    if (!formData.firstname?.trim() || !formData.lastname?.trim() || !formData.email?.trim() || !formData.password?.trim()) {
      showToast('Please fill in all required fields (First Name, Last Name, Email, Password)', 'error');
      return;
    }

    setFormSubmitting(true);
    try {
      const data = new FormData();
      data.append('firstname', formData.firstname.trim());
      data.append('lastname', formData.lastname.trim());
      data.append('email', formData.email.trim());
      data.append('password', formData.password);
      data.append('school_id', schoolId);
      data.append('role_id', activeTab === 'students' ? 4 : 3);
      data.append('gender', formData.gender || 'other');

      if (formData.contact_number?.trim()) data.append('contact_number', formData.contact_number.trim());
      if (formData.address?.trim()) data.append('address', formData.address.trim());

      if (activeTab === 'students') {
        if (formData.student_number?.trim()) data.append('student_number', formData.student_number.trim());
        if (formData.department?.trim()) data.append('department', formData.department.trim());
        if (formData.year_level?.trim()) data.append('year_level', formData.year_level.trim());
      } else {
        if (formData.employee_number?.trim()) data.append('employee_number', formData.employee_number.trim());
        if (formData.position?.trim()) data.append('position', formData.position.trim());
      }

      if (profileImageFile) {
        data.append('profile_image', profileImageFile);
      }

      const response = await api.post('/users', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.success || response.data) {
        if (activeTab === 'students') {
          await fetchStudents();
        } else {
          await fetchLibrarians();
        }
        setShowAddModal(false);
        resetForm();
        showToast(`${activeTab === 'students' ? 'Student' : 'Librarian'} account created successfully!`, 'success');
      } else {
        showToast('Failed to add user: ' + (response.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      showToast('Error adding user: ' + (error.response?.data?.message || error.message || 'Please try again'), 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      firstname: user.firstname || '',
      lastname: user.lastname || '',
      email: user.email || '',
      password: '',
      employee_number: user.employee_number || '',
      student_number: user.student_number || '',
      contact_number: user.contact_number || '',
      gender: user.gender || '',
      position: user.position || '',
      department: user.department || '',
      year_level: user.year_level || '',
      address: user.address || '',
    });
    setProfileImageFile(null);
    setProfileImagePreview(user.profile_image || user.profile_picture ? getBackendAssetUrl(user.profile_image || user.profile_picture) : null);
    setShowAddModal(true);
  };

  const handleUpdateUser = async (e) => {
    if (e) e.preventDefault();
    if (!formData.firstname?.trim() || !formData.lastname?.trim() || !formData.email?.trim()) {
      showToast('Please fill in First Name, Last Name, and Email', 'error');
      return;
    }

    setFormSubmitting(true);
    try {
      const data = new FormData();
      data.append('firstname', formData.firstname.trim());
      data.append('lastname', formData.lastname.trim());
      data.append('email', formData.email.trim());
      data.append('school_id', schoolId);
      data.append('gender', formData.gender || 'other');

      if (formData.password?.trim()) data.append('password', formData.password.trim());
      if (formData.contact_number?.trim()) data.append('contact_number', formData.contact_number.trim());
      if (formData.address?.trim()) data.append('address', formData.address.trim());

      if (activeTab === 'students') {
        if (formData.student_number?.trim()) data.append('student_number', formData.student_number.trim());
        if (formData.department?.trim()) data.append('department', formData.department.trim());
        if (formData.year_level?.trim()) data.append('year_level', formData.year_level.trim());
      } else {
        if (formData.employee_number?.trim()) data.append('employee_number', formData.employee_number.trim());
        if (formData.position?.trim()) data.append('position', formData.position.trim());
      }

      if (profileImageFile) {
        data.append('profile_image', profileImageFile);
      }

      await api.put(`/users/${editingUser.user_id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (activeTab === 'students') {
        await fetchStudents();
      } else {
        await fetchLibrarians();
      }
      setShowAddModal(false);
      resetForm();
      showToast('User record updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Error updating user: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const currentStatus = (user.status || 'active').toLowerCase();
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const data = new FormData();
      data.append('status', nextStatus);
      data.append('school_id', schoolId);

      await api.put(`/users/${user.user_id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (activeTab === 'students') {
        setStudents(prev => prev.map(s => s.user_id === user.user_id ? { ...s, status: nextStatus } : s));
      } else {
        setLibrarians(prev => prev.map(l => l.user_id === user.user_id ? { ...l, status: nextStatus } : l));
      }

      showToast(`Account of ${user.firstname} ${user.lastname} set to ${nextStatus.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Error toggling user status:', error);
      showToast('Failed to change user status', 'error');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTargetUser) return;
    try {
      await api.delete(`/users/${deleteTargetUser.user_id}`);
      if (activeTab === 'students') {
        await fetchStudents();
      } else {
        await fetchLibrarians();
      }
      showToast('User account deleted permanently.', 'success');
      setDeleteTargetUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Failed to delete user: ' + (error.response?.data?.message || error.message), 'error');
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setProfileImageFile(null);
    setProfileImagePreview(null);
    setShowPassword(false);
    setFormData({
      firstname: '',
      lastname: '',
      email: '',
      password: '',
      employee_number: '',
      student_number: '',
      contact_number: '',
      gender: '',
      position: '',
      department: '',
      year_level: '',
      address: '',
    });
  };

  // Filtered dataset
  const currentUsers = activeTab === 'students' ? students : librarians;

  const filteredUsers = useMemo(() => {
    return currentUsers.filter(user => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q ||
        user.firstname?.toLowerCase().includes(q) ||
        user.lastname?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.student_number?.toLowerCase().includes(q) ||
        user.employee_number?.toLowerCase().includes(q) ||
        user.position?.toLowerCase().includes(q);

      const userStatus = user.status?.toLowerCase() || 'active';
      const matchesStatus = statusFilter === 'all' || userStatus === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [currentUsers, searchQuery, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredUsers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredUsers, currentPage, rowsPerPage]);

  // Adjust current page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Metrics computation
  const totalUsersCount = students.length + librarians.length;
  const activeStudentsCount = students.filter(s => (s.status || 'active').toLowerCase() === 'active').length;
  const activeLibrariansCount = librarians.filter(l => (l.status || 'active').toLowerCase() === 'active').length;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-md transition-all animate-bounce-short ${
          toastMessage.type === 'error'
            ? 'bg-rose-600/95 text-white border border-rose-400/40 shadow-rose-900/20'
            : 'bg-emerald-600/95 text-white border border-emerald-400/40 shadow-emerald-900/20'
        }`}>
          {toastMessage.type === 'error' ? <FiAlertCircle className="w-4 h-4" /> : <FiCheck className="w-4 h-4" />}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Page Header Studio */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FiUsers className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Users Management</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {schoolInfo?.school_code || 'CAMPUS'}
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Directory of enrolled students, library attendants, and administrators registered under {schoolInfo?.school_name || 'your institution'}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === 'librarians' ? (
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <FiPlus className="w-4 h-4" />
              <span>Add New Librarian</span>
            </button>
          ) : (
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              title="Supervisory Override to Register Student"
            >
              <FiPlus className="w-4 h-4" />
              <span>Register Student (Admin Override)</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern Top KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registered */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Campus Accounts</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FiUsers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{totalUsersCount}</span>
            <span className="text-[11px] font-semibold text-slate-500">Total Users</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <span>{students.length} Students</span>
            <span>•</span>
            <span>{librarians.length} Librarians</span>
          </div>
        </div>

        {/* Card 2: Students Enrolled */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Students Enrolled</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FiUserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{students.length}</span>
            <span className="text-[11px] font-semibold text-emerald-600">{activeStudentsCount} Active</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Borrowing Eligible
          </div>
        </div>

        {/* Card 3: Staff Librarians */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Library Attendants</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FiShield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{librarians.length}</span>
            <span className="text-[11px] font-semibold text-indigo-600">{activeLibrariansCount} Active</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Counter Operators
          </div>
        </div>

        {/* Card 4: Institution School */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Campus</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FiBookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 min-w-0">
            <div className="text-sm font-black text-slate-900 truncate" title={schoolInfo?.school_name}>
              {schoolInfo?.school_name || 'Loading...'}
            </div>
            <div className="text-[11px] font-mono font-semibold text-slate-400 mt-0.5">
              Code: {schoolInfo?.school_code || 'N/A'}
            </div>
          </div>
          <div className="mt-2 text-[10px] font-semibold text-slate-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> LibraLink Central Node
          </div>
        </div>
      </div>

      {/* Unified Search, Filter & Tab Segment Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Segmented Tab Selector */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-fit">
            <button
              onClick={() => {
                setActiveTab('students');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FiUsers className="w-3.5 h-3.5" />
              <span>Students</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'students' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {students.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('librarians');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'librarians'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FiShield className="w-3.5 h-3.5" />
              <span>Librarians</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'librarians' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {librarians.length}
              </span>
            </button>
          </div>

          {/* Right Side: Search Box + Status Filter + View Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 md:justify-end">
            {/* Live Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <FiSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'students' ? 'students by name, ID, email...' : 'librarians by name, position...'}`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50/80 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Table View"
              >
                <FiList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid Cards View"
              >
                <FiGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200/80">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-600 animate-pulse">
            <FiUsers className="w-7 h-7" />
          </div>
          <div className="text-base font-bold text-slate-900 mb-1">Loading Directory...</div>
          <p className="text-xs text-slate-500">Fetching user records from campus registry</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <FiUsers className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-800">No {activeTab === 'students' ? 'Students' : 'Librarians'} Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery 
              ? `No user records matching "${searchQuery}". Try modifying your search query or reset the filters.`
              : `There are currently no ${activeTab} registered in this campus.`
            }
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Table View */}
          {viewMode === 'table' ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[760px] table-fixed">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-[32%]">Member Profile</th>
                      <th className="py-3.5 px-4 w-[22%]">Contact Info</th>
                      <th className="py-3.5 px-4 w-[16%]">{activeTab === 'students' ? 'Student ID' : 'Employee ID'}</th>
                      <th className="py-3.5 px-4 w-[14%]">Campus</th>
                      <th className="py-3.5 px-4 w-[8%] text-center">Status</th>
                      <th className="py-3.5 px-4 w-[8%] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedUsers.map((user) => {
                      const fullName = `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'Unnamed User';
                      const initials = `${(user.firstname?.[0] || '').toUpperCase()}${(user.lastname?.[0] || '').toUpperCase()}` || 'U';
                      const avatarGradient = getAvatarGradient(fullName);
                      const idNumber = activeTab === 'students' ? (user.student_number || '—') : (user.employee_number || '—');
                      const status = (user.status || 'active').toLowerCase();
                      const profilePic = user.profile_image || user.profile_picture;

                      return (
                        <tr key={user.user_id} className="hover:bg-blue-50/40 transition-colors group">
                          {/* Member Profile with Avatar Picture */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200/80 bg-slate-100 shadow-2xs">
                                {profilePic ? (
                                  <img 
                                    src={getBackendAssetUrl(profilePic)} 
                                    alt={fullName} 
                                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div 
                                  className={`w-full h-full bg-gradient-to-br ${avatarGradient} text-white font-bold text-xs flex items-center justify-center ${profilePic ? 'hidden' : 'flex'}`}
                                >
                                  {initials}
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                  {fullName}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                                  {activeTab === 'librarians' && user.position ? (
                                    <span className="font-medium text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">{user.position}</span>
                                  ) : (
                                    <span className="capitalize">{user.gender || 'Member'}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="py-3.5 px-4">
                            <div className="min-w-0">
                              <div className="text-slate-700 font-medium truncate flex items-center gap-1.5" title={user.email}>
                                <FiMail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{user.email || 'No email registered'}</span>
                              </div>
                              {user.contact_number && (
                                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                                  <FiPhone className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{user.contact_number}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* ID Number */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {idNumber}
                            </span>
                          </td>

                          {/* Campus */}
                          <td className="py-3.5 px-4">
                            <span className="text-slate-600 font-medium truncate block" title={schoolInfo?.school_name}>
                              {schoolInfo?.school_name || 'Santa Rita College'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                              {status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleToggleUserStatus(user)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                  status === 'active'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                    : 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                                }`}
                                title={status === 'active' ? 'Click to Deactivate Account' : 'Click to Activate Account'}
                              >
                                {status === 'active' ? <FiUserCheck className="w-3.5 h-3.5" /> : <FiAlertCircle className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer shadow-2xs"
                                title="Edit User Details"
                              >
                                <FiEdit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTargetUser(user)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all cursor-pointer shadow-2xs"
                                title="Delete User Account"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Grid Cards View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedUsers.map((user) => {
                const fullName = `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'Unnamed User';
                const initials = `${(user.firstname?.[0] || '').toUpperCase()}${(user.lastname?.[0] || '').toUpperCase()}` || 'U';
                const avatarGradient = getAvatarGradient(fullName);
                const idNumber = activeTab === 'students' ? (user.student_number || '—') : (user.employee_number || '—');
                const status = (user.status || 'active').toLowerCase();
                const profilePic = user.profile_image || user.profile_picture;

                return (
                  <div 
                    key={user.user_id} 
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 shadow-xs">
                            {profilePic ? (
                              <img 
                                src={getBackendAssetUrl(profilePic)} 
                                alt={fullName} 
                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-full h-full bg-gradient-to-br ${avatarGradient} text-white font-bold text-sm flex items-center justify-center ${profilePic ? 'hidden' : 'flex'}`}
                            >
                              {initials}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                              {fullName}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium truncate">
                              {activeTab === 'librarians' && user.position ? user.position : (activeTab === 'students' ? 'Student Member' : 'Staff Librarian')}
                            </p>
                          </div>
                        </div>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px] font-medium">{activeTab === 'students' ? 'Student ID:' : 'Employee ID:'}</span>
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            {idNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 truncate" title={user.email}>
                          <FiMail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{user.email || 'No email registered'}</span>
                        </div>
                        {user.contact_number && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <FiPhone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{user.contact_number}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                          status === 'active'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                        title={status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                      >
                        {status === 'active' ? <FiUserCheck className="w-3.5 h-3.5" /> : <FiAlertCircle className="w-3.5 h-3.5" />}
                        <span>{status === 'active' ? 'Active' : 'Inactive'}</span>
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                      >
                        <FiEdit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteTargetUser(user)}
                        className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-400 text-xs transition-all cursor-pointer shadow-2xs"
                        title="Delete User"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sleek Modern Sticky Translucent Glassmorphic Floating Island Pagination Toolbar */}
          <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-md p-3 sm:p-3.5 shadow-xl shadow-slate-900/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-all">
            <div className="flex items-center gap-3 text-slate-600 font-medium">
              <span>
                Showing <strong className="text-slate-900 font-bold">{filteredUsers.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</strong> to <strong className="text-slate-900 font-bold">{Math.min(currentPage * rowsPerPage, filteredUsers.length)}</strong> of <strong className="text-slate-900 font-bold">{filteredUsers.length}</strong> {activeTab}
              </span>

              <div className="flex items-center gap-1.5 border-l border-slate-300/70 pl-3">
                <span className="text-slate-500">Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white/80 backdrop-blur-xs border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Page navigation buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200/80 bg-white/60 hover:bg-white text-slate-600 disabled:opacity-35 disabled:hover:bg-white/40 cursor-pointer disabled:cursor-not-allowed transition-all shadow-2xs"
                title="First Page"
              >
                <FiChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200/80 bg-white/60 hover:bg-white text-slate-600 disabled:opacity-35 disabled:hover:bg-white/40 cursor-pointer disabled:cursor-not-allowed transition-all shadow-2xs"
                title="Previous Page"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                  })
                  .reduce((acc, page, idx, arr) => {
                    if (idx > 0 && page - arr[idx - 1] > 1) {
                      acc.push('ellipsis-' + page);
                    }
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item) => {
                    if (typeof item === 'string') {
                      return <span key={item} className="px-1.5 text-slate-400 font-medium">...</span>;
                    }
                    const isCurrent = item === currentPage;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                            : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg border border-slate-200/80 bg-white/60 hover:bg-white text-slate-600 disabled:opacity-35 disabled:hover:bg-white/40 cursor-pointer disabled:cursor-not-allowed transition-all shadow-2xs"
                title="Next Page"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg border border-slate-200/80 bg-white/60 hover:bg-white text-slate-600 disabled:opacity-35 disabled:hover:bg-white/40 cursor-pointer disabled:cursor-not-allowed transition-all shadow-2xs"
                title="Last Page"
              >
                <FiChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Enhanced Add / Edit User Modal Studio */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden bg-white border border-slate-200 flex flex-col animate-scale-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-6 text-white shrink-0 relative">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xs">
                  {editingUser ? <FiEdit3 className="w-5 h-5 text-white" /> : <FiPlus className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editingUser 
                      ? `Edit ${activeTab === 'students' ? 'Student Profile' : 'Librarian Profile'}` 
                      : `Register New ${activeTab === 'students' ? 'Student' : 'Staff Librarian'}`
                    }
                  </h3>
                  <p className="text-blue-100 text-xs mt-0.5 font-medium">
                    {editingUser 
                      ? 'Modify credentials, profile photo, and institutional permissions' 
                      : `Fill in the registration details for ${schoolInfo?.school_name || 'campus'}`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Form Body with Structured Visual Sections */}
            <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* SECTION 1: Profile Picture & Identity */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FiUser className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Profile Photo & Identity</span>
                </div>

                {/* Profile Photo Uploader Studio */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-slate-300 group-hover:border-blue-500 bg-white flex items-center justify-center transition-all shadow-inner">
                      {profileImagePreview ? (
                        <img 
                          src={profileImagePreview} 
                          alt="Profile Preview" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                          <FiCamera className="w-6 h-6 mb-0.5" />
                          <span className="text-[9px] font-bold">Upload</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Overlay Camera Icon Trigger */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-all cursor-pointer hover:scale-110"
                      title="Choose Profile Picture"
                    >
                      <FiCamera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageSelect(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 text-xs font-semibold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        <FiUploadCloud className="w-3.5 h-3.5 text-blue-600" />
                        <span>{profileImagePreview ? 'Change Photo' : 'Upload Profile Photo'}</span>
                      </button>

                      {profileImagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileImageFile(null);
                            setProfileImagePreview(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                          title="Remove Photo"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      PNG, JPG or WebP up to 5MB. Clear face portrait recommended for library verification.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">First Name <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <FiUser className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Maria"
                        value={formData.firstname}
                        onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                        required
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Last Name <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <FiUser className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Santos"
                        value={formData.lastname}
                        onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                        required
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer bg-white"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other / Non-binary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact / Mobile Number</label>
                    <div className="relative">
                      <FiPhone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. 0917-123-4567"
                        value={formData.contact_number}
                        onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Account Access Credentials */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FiLock className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">2. Account Credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Email Address <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <FiMail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        placeholder="e.g. user@libralink.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Account Password {editingUser ? <span className="text-slate-400 font-normal">(leave blank to keep current)</span> : <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <FiLock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={editingUser ? 'Enter new password if updating' : 'Create a secure password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingUser}
                        className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showPassword ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Institutional & Role Specific Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FiBriefcase className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    3. {activeTab === 'students' ? 'Student Enrollment Details' : 'Librarian Staff & Role Designation'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {activeTab === 'students' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Student Number / LRN</label>
                        <div className="relative">
                          <FiHash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="e.g. 20-16655"
                            value={formData.student_number}
                            onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Year Level</label>
                        <select
                          value={formData.year_level}
                          onChange={(e) => setFormData({ ...formData, year_level: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer bg-white"
                        >
                          <option value="">Select Year Level</option>
                          <option value="1st Year">1st Year College</option>
                          <option value="2nd Year">2nd Year College</option>
                          <option value="3rd Year">3rd Year College</option>
                          <option value="4th Year">4th Year College</option>
                          <option value="Senior High">Senior High School</option>
                          <option value="Junior High">Junior High School</option>
                          <option value="Faculty / Graduate">Faculty / Graduate School</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID Number</label>
                        <div className="relative">
                          <FiHash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="e.g. EMP-99201"
                            value={formData.employee_number}
                            onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Librarian Designation / Position</label>
                        <select
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer bg-white"
                        >
                          <option value="">Select Position</option>
                          <option value="Chief Librarian">Chief Librarian</option>
                          <option value="Assistant Librarian">Assistant Librarian</option>
                          <option value="Circulation Desk Attendant">Circulation Desk Attendant</option>
                          <option value="Cataloging Specialist">Cataloging Specialist</option>
                          <option value="Library Technician">Library Technician</option>
                          <option value="Reference Librarian">Reference Librarian</option>
                          <option value="Archivist">Archivist</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Address / Residence</label>
                    <div className="relative">
                      <FiMapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Brgy. San Jose, Angeles City"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Saving...' : editingUser ? 'Save Changes' : `Register ${activeTab === 'students' ? 'Student' : 'Librarian'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      {deleteTargetUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="rounded-3xl shadow-2xl w-full max-w-md bg-white border border-slate-200 p-6 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto mb-4">
              <FiTrash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 text-center">Confirm User Deletion</h3>
            <p className="text-xs text-slate-500 text-center mt-1.5">
              Are you sure you want to permanently delete the account of <strong className="text-slate-800">{deleteTargetUser.firstname} {deleteTargetUser.lastname}</strong>? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteTargetUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/25 transition-all cursor-pointer"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarianAdminAddLibrarian;
