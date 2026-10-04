import React, { useState, useEffect } from 'react';
import {
  FiGrid,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiBook,
  FiUsers,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiLayers,
  FiActivity,
  FiX,
  FiChevronRight,
  FiInfo,
  FiCheck,
  FiRefreshCw,
  FiUserPlus,
  FiCopy,
  FiLock,
  FiMail,
  FiHash,
  FiBriefcase,
  FiKey,
  FiBarChart2,
  FiPieChart,
  FiSend,
  FiExternalLink,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiUserCheck,
  FiFileText,
  FiPhone,
  FiCheckSquare,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import api from '../../../utils/api';

const PIE_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#6366F1', '#14B8A6'];

const LIBRARY_TYPES = [
  { value: 'college', label: 'College / Higher Education', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'senior_high_school', label: 'Senior High School (SHS)', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'junior_high_school', label: 'Junior High School (JHS)', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'elementary', label: 'Elementary Education', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'specialized', label: 'Specialized / Research Library', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
];

function getBadgeProps(type) {
  const found = LIBRARY_TYPES.find((t) => t.value === type);
  return found || { value: type, label: type?.replace(/_/g, ' ') || 'General', badgeClass: 'bg-slate-50 text-slate-700 border-slate-200' };
}

export default function LibrarianAdminLibraries({ selectedLibraryId, onSelectLibrary, onNavigateTab, onLibrariesUpdated }) {
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal States for Create / Edit Library
  const [showModal, setShowModal] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    library_type: 'college',
    description: '',
    status: 'active'
  });

  // Also Create Librarian inside Create Library modal
  const [includeLibrarian, setIncludeLibrarian] = useState(false);
  const [libLibrarianForm, setLibLibrarianForm] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    employee_number: '',
    position: 'Unit Librarian',
    role_id: 3 // 3 = Librarian, 2 = Librarian Admin
  });

  // Standalone Add Librarian Modal state (from card or header button)
  const [addLibrarianModal, setAddLibrarianModal] = useState({
    isOpen: false,
    targetLibraryId: '',
    targetLibraryName: '',
    submitting: false,
    form: {
      firstname: '',
      lastname: '',
      email: '',
      password: '',
      employee_number: '',
      position: 'Unit Librarian',
      role_id: 3
    }
  });

  // Assign Existing Librarian Drawer/Modal state
  const [librariansModalLib, setLibrariansModalLib] = useState(null);
  const [schoolLibrarians, setSchoolLibrarians] = useState([]);
  const [loadingLibrarians, setLoadingLibrarians] = useState(false);

  // Credentials Success Modal state
  const [credentialsModal, setCredentialsModal] = useState({
    isOpen: false,
    copied: false,
    data: null
  });

  // 360° Library Hub Modal State
  const [hubModal, setHubModal] = useState({
    isOpen: false,
    library: null,
    activeTab: 'analytics', // 'analytics' | 'patrons' | 'librarians' | 'adduser'
    loading: false,
    analyticsData: null
  });

  // Email Librarian Modal State
  const [emailModal, setEmailModal] = useState({
    isOpen: false,
    librarian: null,
    library: null,
    subject: '',
    message: '',
    priority: 'normal',
    sending: false
  });

  // Hub Add User Form State
  const [hubUserForm, setHubUserForm] = useState({
    user_type: 'student', // 'student' | 'librarian'
    firstname: '',
    lastname: '',
    email: '',
    student_number: '',
    employee_number: '',
    position: 'Unit Librarian',
    role_id: 4,
    password: '',
    contact_number: '',
    gender: 'other',
    submitting: false
  });

  // Hub Patrons filter & search
  const [hubPatronSearch, setHubPatronSearch] = useState('');

  // Delete Library Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    library: null,
    password: '',
    showPassword: false,
    submitting: false,
    error: null
  });

  // Toast notification
  const [toast, setToast] = useState(null);

  // Robust schoolId resolution with fallback
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
  let parsedUser = null;
  try {
    parsedUser = userStr ? JSON.parse(userStr) : null;
  } catch {}

  const rawSchoolId = typeof window !== 'undefined' ? localStorage.getItem('schoolId') : null;
  const schoolId = (rawSchoolId && rawSchoolId !== 'null' && rawSchoolId !== 'undefined')
    ? rawSchoolId
    : (parsedUser?.school_id ? String(parsedUser.school_id) : '1');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchLibraries();
    fetchSchool();
  }, [schoolId]);

  const fetchSchool = async () => {
    if (!schoolId) return;
    try {
      const res = await api.get(`/schools/${schoolId}`);
      setSchoolInfo(res?.data || res);
    } catch (err) {
      console.warn('Could not fetch school details:', err);
    }
  };

  const fetchLibraries = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await api.get(`/libraries/school/${schoolId}/stats`);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setLibraries(list);
    } catch (err) {
      console.error('Error fetching libraries:', err);
      showToast('Failed to load libraries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLibrariansForSchool = async () => {
    if (!schoolId) return;
    try {
      setLoadingLibrarians(true);
      const res = await api.get(`/users/school/${schoolId}?role_id=3`);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setSchoolLibrarians(list);
    } catch (err) {
      console.error('Error fetching librarians:', err);
    } finally {
      setLoadingLibrarians(false);
    }
  };

  const handleOpenHubModal = async (lib, initialTab = 'analytics') => {
    setHubModal({
      isOpen: true,
      library: lib,
      activeTab: initialTab,
      loading: true,
      analyticsData: null
    });
    setHubUserForm({
      user_type: 'student',
      firstname: '',
      lastname: '',
      email: '',
      student_number: '',
      employee_number: '',
      position: 'Unit Librarian',
      role_id: 4,
      password: generateRandomPassword('', ''),
      contact_number: '',
      gender: 'other',
      submitting: false
    });
    try {
      const res = await api.get(`/libraries/${lib.library_id}/analytics`);
      const aData = res?.data || res;
      setHubModal(prev => ({
        ...prev,
        loading: false,
        analyticsData: aData
      }));
    } catch (err) {
      console.error('Error fetching library analytics:', err);
      setHubModal(prev => ({ ...prev, loading: false }));
      showToast('Could not load detailed library analytics', 'error');
    }
  };

  const handleOpenEmailModal = (librarian, targetLib = null) => {
    const libObj = targetLib || hubModal.library;
    const libName = libObj?.name || 'Library Unit';
    setEmailModal({
      isOpen: true,
      librarian,
      library: libObj,
      subject: `Official Circulation Memo - ${libName}`,
      message: `Dear ${librarian.firstname || 'Librarian'},\n\nPlease be informed regarding the latest circulation updates and library administrative announcements for ${libName}.\n\nBest regards,\nLibrary Administration`,
      priority: 'normal',
      sending: false
    });
  };

  const handleSendEmailMemo = async (e) => {
    e.preventDefault();
    const { librarian, library, subject, message, priority } = emailModal;
    if (!message || !message.trim()) {
      showToast('Message content cannot be empty', 'error');
      return;
    }
    const libId = library?.library_id || hubModal.library?.library_id;
    if (!libId) return;

    try {
      setEmailModal(prev => ({ ...prev, sending: true }));
      const res = await api.post(`/libraries/${libId}/email-librarian`, {
        recipient_user_id: librarian.user_id,
        recipient_email: librarian.email,
        recipient_name: `${librarian.firstname} ${librarian.lastname || ''}`.trim(),
        subject,
        message,
        priority
      });

      if (res?.email_dispatched) {
        showToast('Official memo dispatched to email & portal!', 'success');
      } else {
        showToast('Official memo delivered to librarian portal!', 'success');
      }
      setEmailModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error('Error sending staff memo:', err);
      showToast(err.response?.data?.message || 'Failed to dispatch staff memo', 'error');
    } finally {
      setEmailModal(prev => ({ ...prev, sending: false }));
    }
  };

  const handleOpenMailClient = () => {
    const { librarian, subject, message } = emailModal;
    if (!librarian?.email) return;
    const mailtoUrl = `mailto:${encodeURIComponent(librarian.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleSubmitHubAddUser = async (e) => {
    e.preventDefault();
    const libId = hubModal.library?.library_id;
    if (!libId) return;

    if (!hubUserForm.firstname.trim() || !hubUserForm.email.trim()) {
      showToast('First Name and Email are required', 'error');
      return;
    }

    try {
      setHubUserForm(prev => ({ ...prev, submitting: true }));
      const payload = {
        ...hubUserForm,
        password: hubUserForm.password || generateRandomPassword(hubUserForm.firstname, hubUserForm.lastname)
      };

      const res = await api.post(`/libraries/${libId}/users`, payload);

      showToast(`${hubUserForm.user_type === 'librarian' ? 'Librarian' : 'Patron'} registered successfully!`, 'success');

      // Refresh list & current analytics
      fetchLibraries();
      handleOpenHubModal(hubModal.library, hubUserForm.user_type === 'librarian' ? 'librarians' : 'patrons');

      // Show credentials modal so admin can copy credentials
      setCredentialsModal({
        isOpen: true,
        copied: false,
        data: {
          name: `${hubUserForm.firstname} ${hubUserForm.lastname || ''}`.trim(),
          email: hubUserForm.email,
          password: payload.password,
          role_name: hubUserForm.user_type === 'librarian'
            ? (Number(hubUserForm.role_id) === 2 ? 'Librarian Admin' : 'Unit Librarian')
            : 'Student Patron',
          library_name: hubModal.library.name,
          library_type: hubModal.library.library_type
        }
      });
    } catch (err) {
      console.error('Error adding user to library:', err);
      showToast(err.response?.data?.message || 'Failed to register user', 'error');
    } finally {
      setHubUserForm(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleOpenDeleteModal = (lib) => {
    setDeleteModal({
      isOpen: true,
      library: lib,
      password: '',
      showPassword: false,
      submitting: false,
      error: null
    });
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    const { library, password } = deleteModal;
    if (!library) return;
    if (!password || !password.trim()) {
      setDeleteModal(prev => ({ ...prev, error: 'Please enter your admin password to confirm.' }));
      return;
    }

    try {
      setDeleteModal(prev => ({ ...prev, submitting: true, error: null }));
      const res = await api.delete(`/libraries/${library.library_id}`, {
        data: { password: password.trim() }
      });

      showToast(res?.message || `Library "${library.name}" has been removed.`, 'success');
      setDeleteModal({
        isOpen: false,
        library: null,
        password: '',
        showPassword: false,
        submitting: false,
        error: null
      });

      // If hub modal was showing this library, close it
      if (hubModal.isOpen && hubModal.library?.library_id === library.library_id) {
        setHubModal(prev => ({ ...prev, isOpen: false, library: null }));
      }

      fetchLibraries();
      if (onLibrariesUpdated) onLibrariesUpdated();
      window.dispatchEvent(new CustomEvent('libralink-libraries-updated'));
    } catch (err) {
      console.error('Error deleting library:', err);
      const errMsg = err.response?.data?.message || err.message || 'Incorrect password or failed to delete library';
      setDeleteModal(prev => ({ ...prev, submitting: false, error: errMsg }));
    }
  };

  // Helper to generate a friendly default password
  const generateRandomPassword = (first, last) => {
    const cleanLast = (last || '').toLowerCase().replace(/[^a-z]/g, '');
    const cleanFirst = (first || '').toLowerCase().replace(/[^a-z]/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return `${cleanLast || cleanFirst || 'librarian'}${randNum}`;
  };

  const handleOpenCreateModal = () => {
    setEditingLibrary(null);
    setFormData({
      name: '',
      library_type: 'college',
      description: '',
      status: 'active'
    });
    setIncludeLibrarian(true);
    const initialPw = generateRandomPassword('Unit', 'Librarian');
    const schoolDomain = schoolInfo?.school_code ? `${schoolInfo.school_code.toLowerCase().trim()}.edu.ph` : 'gnc.edu.ph';
    setLibLibrarianForm({
      firstname: '',
      lastname: 'Librarian',
      email: '',
      password: initialPw,
      employee_number: `LIB-${Math.floor(10000 + Math.random() * 90000)}`,
      position: 'Unit Librarian',
      role_id: 3,
      isCustomEmail: false
    });
    setShowModal(true);
  };

  const handleLibraryNameChange = (nameVal) => {
    setFormData(prev => ({ ...prev, name: nameVal }));
    if (!editingLibrary) {
      const cleanSlug = nameVal
        .toLowerCase()
        .replace(/library/i, '')
        .trim()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 8) || 'unit';
      const schoolDomain = schoolInfo?.school_code ? `${schoolInfo.school_code.toLowerCase().trim()}.edu.ph` : 'gnc.edu.ph';
      const suggestedFirst = nameVal.replace(/library/i, '').trim() || 'Unit';

      setLibLibrarianForm(prev => ({
        ...prev,
        firstname: prev.isCustomFirst ? prev.firstname : suggestedFirst,
        email: prev.isCustomEmail ? prev.email : `librarian.${cleanSlug}@${schoolDomain}`
      }));
    }
  };

  const handleOpenEditModal = (lib) => {
    setEditingLibrary(lib);
    setFormData({
      name: lib.name || '',
      library_type: lib.library_type || 'college',
      description: lib.description || '',
      status: lib.status || 'active'
    });
    setIncludeLibrarian(false);
    setShowModal(true);
  };

  // Submit Create or Edit Library
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Library name is required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (editingLibrary) {
        await api.put(`/libraries/${editingLibrary.library_id}`, formData);
        showToast(`Library "${formData.name}" updated successfully!`, 'success');
      } else {
        const schoolDomain = schoolInfo?.school_code ? `${schoolInfo.school_code.toLowerCase().trim()}.edu.ph` : 'gnc.edu.ph';
        const cleanSlug = formData.name.toLowerCase().replace(/library/i, '').trim().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'unit';
        const fallbackFirst = formData.name.replace(/library/i, '').trim() || 'Unit';
        
        const payload = {
          ...formData,
          school_id: schoolId,
          librarian: {
            ...libLibrarianForm,
            firstname: libLibrarianForm.firstname.trim() || fallbackFirst,
            lastname: libLibrarianForm.lastname.trim() || 'Librarian',
            email: libLibrarianForm.email.trim() || `librarian.${cleanSlug}@${schoolDomain}`,
            password: libLibrarianForm.password || generateRandomPassword('Unit', 'Librarian')
          }
        };

        const res = await api.post('/libraries', payload);
        showToast(`New library "${formData.name}" and librarian set created!`, 'success');

        // Always show credentials modal for the brand new librarian set
        const createdLib = res?.data || res || {};
        const createdLibrarian = res?.created_librarian || res?.data?.created_librarian || payload.librarian;
        if (createdLibrarian) {
          setCredentialsModal({
            isOpen: true,
            copied: false,
            data: {
              name: createdLibrarian.name || `${createdLibrarian.firstname} ${createdLibrarian.lastname || ''}`.trim(),
              email: createdLibrarian.email,
              password: createdLibrarian.password || payload.librarian.password,
              role_name: Number(createdLibrarian.role_id) === 2 ? 'Librarian Admin' : 'Unit Librarian',
              library_name: createdLib.name || formData.name,
              library_type: createdLib.library_type || formData.library_type
            }
          });
        }
      }

      setShowModal(false);
      fetchLibraries();
      if (onLibrariesUpdated) onLibrariesUpdated();
      window.dispatchEvent(new CustomEvent('libralink-libraries-updated'));
    } catch (err) {
      console.error('Error saving library:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to save library', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (lib) => {
    const newStatus = lib.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/libraries/${lib.library_id}`, { status: newStatus });
      showToast(`Library "${lib.name}" is now ${newStatus}.`, 'success');
      fetchLibraries();
      if (onLibrariesUpdated) onLibrariesUpdated();
      window.dispatchEvent(new CustomEvent('libralink-libraries-updated'));
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Could not update status', 'error');
    }
  };

  const handleOpenLibrariansModal = (lib) => {
    setLibrariansModalLib(lib);
    fetchLibrariansForSchool();
  };

  const handleAssignLibrarian = async (userId, targetLibId) => {
    try {
      await api.put(`/users/${userId}`, { library_id: targetLibId });
      showToast('Librarian assignment updated!', 'success');
      fetchLibraries();
      fetchLibrariansForSchool();
      window.dispatchEvent(new CustomEvent('libralink-libraries-updated'));
    } catch (err) {
      console.error('Error assigning librarian:', err);
      showToast('Failed to assign librarian', 'error');
    }
  };

  // Open standalone Add Librarian Modal
  const handleOpenAddLibrarianModal = (lib = null) => {
    const defaultLibId = lib?.library_id || (libraries[0]?.library_id ? String(libraries[0].library_id) : '');
    const defaultLibName = lib?.name || (libraries[0]?.name || '');
    setAddLibrarianModal({
      isOpen: true,
      targetLibraryId: defaultLibId ? String(defaultLibId) : '',
      targetLibraryName: defaultLibName,
      submitting: false,
      form: {
        firstname: '',
        lastname: '',
        email: '',
        password: generateRandomPassword('', ''),
        employee_number: '',
        position: 'Unit Librarian',
        role_id: 3
      }
    });
  };

  // Submit standalone Add Librarian
  const handleSubmitAddLibrarian = async (e) => {
    e.preventDefault();
    const { form, targetLibraryId } = addLibrarianModal;

    if (!form.firstname.trim() || !form.email.trim()) {
      showToast('First Name and Email are required', 'error');
      return;
    }
    if (!targetLibraryId) {
      showToast('Please select a target library unit', 'error');
      return;
    }

    try {
      setAddLibrarianModal(prev => ({ ...prev, submitting: true }));
      const targetLib = libraries.find(l => String(l.library_id) === String(targetLibraryId));

      const res = await api.post(`/libraries/${targetLibraryId}/librarians`, {
        ...form,
        password: form.password || generateRandomPassword(form.firstname, form.lastname)
      });

      showToast(`Librarian account created for ${targetLib?.name || 'Library'}!`, 'success');

      setAddLibrarianModal(prev => ({ ...prev, isOpen: false }));
      fetchLibraries();
      if (onLibrariesUpdated) onLibrariesUpdated();
      window.dispatchEvent(new CustomEvent('libralink-libraries-updated'));

      // Open credentials preview modal
      setCredentialsModal({
        isOpen: true,
        copied: false,
        data: {
          name: `${form.firstname} ${form.lastname || ''}`.trim(),
          email: form.email,
          password: form.password,
          role_name: Number(form.role_id) === 2 ? 'Librarian Admin' : 'Unit Librarian',
          library_name: targetLib?.name || 'Assigned Library',
          library_type: targetLib?.library_type || 'college'
        }
      });
    } catch (err) {
      console.error('Error creating librarian:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to create librarian account', 'error');
    } finally {
      setAddLibrarianModal(prev => ({ ...prev, submitting: false }));
    }
  };

  // Copy credentials helper
  const handleCopyCredentials = () => {
    if (!credentialsModal.data) return;
    const text = `LibraLink Librarian Credentials:
Name: ${credentialsModal.data.name}
Role: ${credentialsModal.data.role_name}
Assigned Library: ${credentialsModal.data.library_name}
Email / Username: ${credentialsModal.data.email}
Password: ${credentialsModal.data.password}
Portal: ${window.location.origin}/login`;

    navigator.clipboard.writeText(text);
    setCredentialsModal(prev => ({ ...prev, copied: true }));
    setTimeout(() => {
      setCredentialsModal(prev => ({ ...prev, copied: false }));
    }, 2500);
  };

  // Filtered libraries
  const filteredLibraries = libraries.filter((lib) => {
    const matchesSearch = (lib.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (lib.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lib.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalBooks = libraries.reduce((acc, l) => acc + (l.total_books || 0), 0);
  const totalStudents = libraries.reduce((acc, l) => acc + (l.total_students || 0), 0);
  const totalLibrarians = libraries.reduce((acc, l) => acc + (l.total_librarians || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {toast.type === 'error' ? <FiAlertCircle className="w-5 h-5 text-rose-600" /> : <FiCheckCircle className="w-5 h-5 text-emerald-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-2xs">
                <FiGrid className="h-5 w-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Libraries Management
              </h1>
              {schoolInfo?.school_code && (
                <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-100">
                  {schoolInfo.school_code}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Configure and manage the distinct library units and educational levels operating under{' '}
              <strong className="text-slate-700">{schoolInfo?.school_name || 'your institution'}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={fetchLibraries}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition active:scale-95 shadow-2xs"
              title="Refresh libraries list"
            >
              <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Quick Add Librarian Button */}
            <button
              type="button"
              onClick={() => handleOpenAddLibrarianModal(null)}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-purple-200 bg-purple-50 hover:bg-purple-100 px-4 py-3 text-xs sm:text-sm font-bold text-purple-700 shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <FiUserPlus className="h-4 w-4 text-purple-600" />
              <span>+ Add Librarian</span>
            </button>

            {/* Create New Library Button */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all cursor-pointer"
            >
              <FiPlus className="h-4 w-4" />
              <span>Create New Library</span>
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Libraries</span>
              <FiLayers className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{libraries.length}</p>
            <span className="text-[10px] font-medium text-slate-500">
              {libraries.filter((l) => l.status === 'active').length} active units
            </span>
          </div>

          <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Books</span>
              <FiBook className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{totalBooks.toLocaleString()}</p>
            <span className="text-[10px] font-medium text-slate-500">Across all libraries</span>
          </div>

          <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Patrons</span>
              <FiUsers className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{totalStudents.toLocaleString()}</p>
            <span className="text-[10px] font-medium text-slate-500">Enrolled students</span>
          </div>

          <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Librarians</span>
              <FiShield className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{totalLibrarians}</p>
            <span className="text-[10px] font-medium text-slate-500">Staff assigned</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search libraries by name, level..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:bg-white focus:outline-none transition"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Libraries Directory Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-3xl border border-slate-200/80 bg-white p-6 h-56 animate-pulse">
              <div className="h-4 w-28 bg-slate-100 rounded mb-3" />
              <div className="h-6 w-48 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-64 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredLibraries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3.5">
            <FiGrid className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No libraries match your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            Create separate library units (e.g. Senior High Library, Junior High, College) to organize your books and patrons.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
          >
            <FiPlus className="w-4 h-4" />
            <span>Create New Library</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLibraries.map((lib) => {
            const badgeProps = getBadgeProps(lib.library_type);
            const isSelected = selectedLibraryId && String(selectedLibraryId) === String(lib.library_id);

            return (
              <div
                key={lib.library_id}
                onClick={() => handleOpenHubModal(lib)}
                className={`group cursor-pointer flex flex-col justify-between rounded-3xl border bg-white p-5 sm:p-6 transition-all duration-200 shadow-xs hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/10'
                    : 'border-slate-200/80 hover:border-blue-300'
                }`}
              >
                <div>
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeProps.badgeClass}`}>
                      {lib.library_type === 'college' ? '📚' : lib.library_type === 'senior_high_school' ? '🎓' : lib.library_type === 'junior_high_school' ? '🎒' : '📖'} {badgeProps.label}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(lib);
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                        lib.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Click to toggle status"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${lib.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{lib.status === 'active' ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>

                  {/* Library Name & Description */}
                  <h3 className="text-base font-black text-slate-900 leading-snug line-clamp-1 group-hover:text-blue-600 transition" title={lib.name}>
                    {lib.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                    {lib.description || 'Dedicated campus academic library collection.'}
                  </p>

                  {/* Metrics Pill Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="rounded-xl bg-slate-50 p-2 text-center group-hover:bg-blue-50/40 transition">
                      <span className="text-[10px] font-semibold text-slate-400 block">Books</span>
                      <span className="text-sm font-black text-slate-800">{(lib.total_books || 0).toLocaleString()}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 text-center group-hover:bg-purple-50/40 transition">
                      <span className="text-[10px] font-semibold text-slate-400 block">Students</span>
                      <span className="text-sm font-black text-slate-800">{(lib.total_students || 0).toLocaleString()}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 text-center group-hover:bg-amber-50/40 transition">
                      <span className="text-[10px] font-semibold text-slate-400 block">Staff</span>
                      <span className="text-sm font-black text-slate-800">{lib.total_librarians || 0}</span>
                    </div>
                  </div>

                  {/* 360 Hub Button Strip */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenHubModal(lib);
                    }}
                    className="w-full mt-3 py-2 px-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-600 hover:to-indigo-600 text-blue-700 hover:text-white border border-blue-200/70 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white group-hover:border-transparent cursor-pointer"
                  >
                    <FiPieChart className="w-3.5 h-3.5" />
                    <span>Open 360° Hub & Analytics</span>
                  </button>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        localStorage.setItem('currentLibraryId', String(lib.library_id));
                        localStorage.setItem('currentLibraryName', lib.name);
                        localStorage.setItem('currentLibraryType', lib.library_type || 'college');
                        window.open('/librarian', '_blank');
                      }}
                      className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition flex items-center gap-1 cursor-pointer"
                      title="Open and preview this library unit's branded portal"
                    >
                      <FiExternalLink className="w-3.5 h-3.5 text-blue-600" />
                      <span>Portal ↗</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddLibrarianModal(lib);
                      }}
                      className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition flex items-center gap-1 cursor-pointer"
                      title="Create a new librarian account for this library"
                    >
                      <FiUserPlus className="w-3.5 h-3.5 text-purple-600" />
                      <span>+ Add Staff</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenLibrariansModal(lib);
                      }}
                      className="px-2 py-1.5 text-[11px] font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
                      title="Manage currently assigned librarians"
                    >
                      <FiShield className="w-3.5 h-3.5 text-slate-500" />
                      <span>({lib.total_librarians || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(lib);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Edit library details"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDeleteModal(lib);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete library unit"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {onSelectLibrary && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLibrary(isSelected ? null : lib.library_id);
                        if (onNavigateTab) onNavigateTab('books');
                      }}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>{isSelected ? 'Viewing Books' : 'View Books'}</span>
                      <FiChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT LIBRARY MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <FiGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingLibrary ? 'Edit Library Information' : 'Create New Library'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {schoolInfo?.school_name || 'Campus Academic Node'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Library Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior High School Library, Junior High School Library"
                  value={formData.name}
                  onChange={(e) => handleLibraryNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:border-blue-500 focus:outline-none transition font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Library Type / Educational Level <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.library_type}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setFormData(prev => ({ ...prev, library_type: nextType }));
                  }}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:border-blue-500 focus:outline-none transition font-medium"
                >
                  {LIBRARY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Students and catalog for this educational level will automatically isolate inside this library.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description / Location Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 2nd Floor Academic Building, dedicated clean unit collection."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={() => setFormData({ ...formData, status: 'active' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formData.status === 'inactive'}
                      onChange={() => setFormData({ ...formData, status: 'inactive' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Inactive</span>
                  </label>
                </div>
              </div>

              {/* ── DEDICATED NEW LIBRARIAN ACCOUNT (BRAND NEW SET) ── */}
              {!editingLibrary && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50/60 border border-purple-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                        <FiUserPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-purple-950 block">
                            Dedicated Unit Librarian Account
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-purple-200/70 text-[9px] font-black uppercase text-purple-800">
                            Brand New Set
                          </span>
                        </div>
                        <span className="text-[11px] text-purple-700">
                          Fresh isolated librarian portal (0 books, 0 students, clean slate).
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-4 rounded-2xl border border-purple-200 bg-white space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Librarian Name / Title
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Junior High"
                          value={libLibrarianForm.firstname}
                          onChange={(e) => setLibLibrarianForm({ ...libLibrarianForm, firstname: e.target.value, isCustomFirst: true })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Last Name / Role
                        </label>
                        <input
                          type="text"
                          placeholder="Librarian"
                          value={libLibrarianForm.lastname}
                          onChange={(e) => setLibLibrarianForm({ ...libLibrarianForm, lastname: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Institutional Login Email
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">Domain-based or custom</span>
                      </div>
                      <div className="relative">
                        <FiMail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          placeholder="e.g. librarian.jhs@gnc.edu.ph"
                          value={libLibrarianForm.email}
                          onChange={(e) => setLibLibrarianForm({ ...libLibrarianForm, email: e.target.value, isCustomEmail: true })}
                          className="w-full pl-8 pr-3 py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700">Initial Password</label>
                          <button
                            type="button"
                            onClick={() => setLibLibrarianForm(p => ({ ...p, password: generateRandomPassword(p.firstname || 'Unit', p.lastname || 'Librarian') }))}
                            className="text-[10px] font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                          >
                            Regenerate
                          </button>
                        </div>
                        <div className="relative">
                          <FiLock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={libLibrarianForm.password}
                            onChange={(e) => setLibLibrarianForm({ ...libLibrarianForm, password: e.target.value })}
                            className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Employee ID</label>
                        <div className="relative">
                          <FiHash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="e.g. LIB-20261"
                            value={libLibrarianForm.employee_number}
                            onChange={(e) => setLibLibrarianForm({ ...libLibrarianForm, employee_number: e.target.value })}
                            className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Designation</label>
                        <input
                          type="text"
                          placeholder="e.g. Unit Librarian"
                          value={libLibrarianForm.position}
                          onChange={(e) => setLibLibrarianForm({ ...libLibrarianForm, position: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Access Role</label>
                        <select
                          value={libLibrarianForm.role_id}
                          onChange={(e) => setLibLibrarianForm({ ...libLibrarianForm, role_id: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-semibold cursor-pointer"
                        >
                          <option value={3}>Unit Librarian (Scoped to this Library)</option>
                          <option value={2}>Librarian Admin (Campus-Wide)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving…' : editingLibrary ? 'Save Changes' : includeLibrarian ? 'Create Library & Librarian' : 'Create Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STANDALONE ADD LIBRARIAN MODAL ── */}
      {addLibrarianModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                  <FiUserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Add New Librarian Account
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create and bind a librarian to a library unit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddLibrarianModal(prev => ({ ...prev, isOpen: false }))}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddLibrarian} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned Library Unit <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FiGrid className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={addLibrarianModal.targetLibraryId}
                    onChange={(e) => setAddLibrarianModal(prev => ({ ...prev, targetLibraryId: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-purple-500 focus:outline-none transition cursor-pointer"
                  >
                    {libraries.map(lib => (
                      <option key={lib.library_id} value={lib.library_id}>
                        {lib.library_type === 'college' ? '📚' : lib.library_type === 'senior_high_school' ? '🎓' : lib.library_type === 'junior_high_school' ? '🎒' : '📖'} {lib.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maria"
                    value={addLibrarianModal.form.firstname}
                    onChange={(e) => setAddLibrarianModal(prev => ({
                      ...prev,
                      form: { ...prev.form, firstname: e.target.value }
                    }))}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:border-purple-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Santos"
                    value={addLibrarianModal.form.lastname}
                    onChange={(e) => setAddLibrarianModal(prev => ({
                      ...prev,
                      form: { ...prev.form, lastname: e.target.value }
                    }))}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:border-purple-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Institutional Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FiMail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. maria.santos@libralink.com"
                    value={addLibrarianModal.form.email}
                    onChange={(e) => setAddLibrarianModal(prev => ({
                      ...prev,
                      form: { ...prev.form, email: e.target.value }
                    }))}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:border-purple-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setAddLibrarianModal(prev => ({
                        ...prev,
                        form: {
                          ...prev.form,
                          password: generateRandomPassword(prev.form.firstname, prev.form.lastname)
                        }
                      }))}
                      className="text-[10px] font-bold text-purple-600 hover:text-purple-800"
                    >
                      Generate
                    </button>
                  </div>
                  <div className="relative">
                    <FiLock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={addLibrarianModal.form.password}
                      onChange={(e) => setAddLibrarianModal(prev => ({
                        ...prev,
                        form: { ...prev.form, password: e.target.value }
                      }))}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:border-purple-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Employee ID
                  </label>
                  <div className="relative">
                    <FiHash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. EMP-99201"
                      value={addLibrarianModal.form.employee_number}
                      onChange={(e) => setAddLibrarianModal(prev => ({
                        ...prev,
                        form: { ...prev.form, employee_number: e.target.value }
                      }))}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-mono rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:border-purple-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Unit Librarian"
                    value={addLibrarianModal.form.position}
                    onChange={(e) => setAddLibrarianModal(prev => ({
                      ...prev,
                      form: { ...prev.form, position: e.target.value }
                    }))}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:border-purple-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Access Level
                  </label>
                  <select
                    value={addLibrarianModal.form.role_id}
                    onChange={(e) => setAddLibrarianModal(prev => ({
                      ...prev,
                      form: { ...prev.form, role_id: Number(e.target.value) }
                    }))}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:border-purple-500 focus:outline-none transition font-semibold"
                  >
                    <option value={3}>Unit Librarian (Scoped to this Library)</option>
                    <option value={2}>Librarian Admin (Campus-Wide)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setAddLibrarianModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLibrarianModal.submitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {addLibrarianModal.submitting ? 'Creating…' : 'Create Librarian Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREDENTIALS SUCCESS MODAL ── */}
      {credentialsModal.isOpen && credentialsModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-6 sm:p-7">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Librarian Account Created!
              </h3>
              <p className="text-xs text-slate-500">
                The account has been created and bound to <strong className="text-slate-700">{credentialsModal.data.library_name}</strong>.
              </p>
            </div>

            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Staff Member
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  {credentialsModal.data.name} ({credentialsModal.data.role_name})
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Login Email
                </span>
                <span className="text-xs sm:text-sm font-mono font-bold text-blue-600 select-all">
                  {credentialsModal.data.email}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Initial Password
                </span>
                <span className="text-xs sm:text-sm font-mono font-bold text-emerald-600 select-all">
                  {credentialsModal.data.password}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-5">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {credentialsModal.copied ? (
                  <>
                    <FiCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-extrabold">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <FiCopy className="w-4 h-4 text-slate-500" />
                    <span>Copy Credentials</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCredentialsModal({ isOpen: false, copied: false, data: null })}
                className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSIGNED LIBRARIANS DRAWER / MODAL ── */}
      {librariansModalLib && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Staff Assignment: {librariansModalLib.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Assign or manage librarians operating this specific library.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLibrariansModalLib(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700">Campus Librarians</span>
                <button
                  type="button"
                  onClick={() => {
                    const lib = librariansModalLib;
                    setLibrariansModalLib(null);
                    handleOpenAddLibrarianModal(lib);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800"
                >
                  <FiUserPlus className="w-3.5 h-3.5" />
                  <span>+ Create New Librarian</span>
                </button>
              </div>

              {loadingLibrarians ? (
                <div className="flex items-center justify-center p-8 text-blue-600 text-xs font-semibold">
                  <FiRefreshCw className="animate-spin w-4 h-4 mr-2" />
                  Loading librarians…
                </div>
              ) : schoolLibrarians.length === 0 ? (
                <div className="text-center p-6 text-slate-400 text-xs">
                  No librarians found under this school. Click "+ Create New Librarian" to create one.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {schoolLibrarians.map((libUser) => {
                    const isAssignedToThis = String(libUser.library_id) === String(librariansModalLib.library_id);
                    return (
                      <div
                        key={libUser.user_id}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                          isAssignedToThis ? 'border-purple-200 bg-purple-50/40' : 'border-slate-200/80 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                            {(libUser.firstname?.[0] || 'L') + (libUser.lastname?.[0] || '')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {libUser.firstname} {libUser.lastname}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {libUser.email} · {libUser.position || 'Librarian'}
                            </p>
                            <span className="text-[9.5px] font-semibold text-purple-700">
                              Current: {libUser.library_name || 'Unassigned'}
                            </span>
                          </div>
                        </div>

                        <div>
                          {isAssignedToThis ? (
                            <button
                              type="button"
                              onClick={() => handleAssignLibrarian(libUser.user_id, null)}
                              className="px-2.5 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition cursor-pointer"
                            >
                              Unassign
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAssignLibrarian(libUser.user_id, librariansModalLib.library_id)}
                              className="px-2.5 py-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition cursor-pointer"
                            >
                              Assign to this Library
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setLibrariansModalLib(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 360° LIBRARY HUB MODAL ── */}
      {hubModal.isOpen && hubModal.library && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 max-h-[92vh] flex flex-col">
            {/* Hub Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white border border-white/10 backdrop-blur-md shrink-0">
                  <FiGrid className="w-5 h-5 text-blue-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-white truncate">
                      {hubModal.library.name}
                    </h2>
                    <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-blue-200 border border-blue-400/30">
                      {getBadgeProps(hubModal.library.library_type).label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 truncate mt-0.5">
                    {hubModal.library.description || 'Dedicated campus academic library unit.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenDeleteModal(hubModal.library)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-400/30 text-xs font-bold transition active:scale-95 cursor-pointer"
                  title="Delete library unit"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete Unit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHubModal(prev => ({ ...prev, isOpen: false }))}
                  className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Hub Navigation Tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-100 bg-slate-50/70 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setHubModal(prev => ({ ...prev, activeTab: 'analytics' }))}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  hubModal.activeTab === 'analytics'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FiPieChart className="w-4 h-4" />
                <span>Analytics & Trends</span>
              </button>

              <button
                type="button"
                onClick={() => setHubModal(prev => ({ ...prev, activeTab: 'patrons' }))}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  hubModal.activeTab === 'patrons'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FiUsers className="w-4 h-4" />
                <span>Patron Monitoring ({hubModal.analyticsData?.summary?.total_patrons || hubModal.analyticsData?.patrons?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setHubModal(prev => ({ ...prev, activeTab: 'librarians' }))}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  hubModal.activeTab === 'librarians'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FiShield className="w-4 h-4" />
                <span>Assigned Staff ({hubModal.analyticsData?.summary?.total_librarians || hubModal.analyticsData?.librarians?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setHubModal(prev => ({ ...prev, activeTab: 'adduser' }))}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  hubModal.activeTab === 'adduser'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-purple-700 hover:text-purple-900 bg-purple-50/50 rounded-t-lg'
                }`}
              >
                <FiUserPlus className="w-4 h-4 text-purple-600" />
                <span>+ Add User / Staff</span>
              </button>
            </div>

            {/* Hub Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              {hubModal.loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <FiRefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                  <p className="text-xs font-bold">Loading 360° Library Hub intelligence...</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: ANALYTICS & CHARTS */}
                  {hubModal.activeTab === 'analytics' && (
                    <div className="space-y-6">
                      {/* Metrics Summary Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Total Books</span>
                          <p className="text-2xl font-black text-slate-900 mt-1">
                            {(hubModal.analyticsData?.summary?.total_books || 0).toLocaleString()}
                          </p>
                          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                            {hubModal.analyticsData?.summary?.available_books || 0} copies available
                          </span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Active Borrows</span>
                          <p className="text-2xl font-black text-blue-600 mt-1">
                            {hubModal.analyticsData?.summary?.active_borrows || 0}
                          </p>
                          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
                            {hubModal.analyticsData?.summary?.overdue_borrows || 0} overdue
                          </span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Enrolled Patrons</span>
                          <p className="text-2xl font-black text-purple-600 mt-1">
                            {hubModal.analyticsData?.summary?.total_patrons || 0}
                          </p>
                          <span className="text-[10px] text-purple-600 font-semibold mt-0.5 block">
                            Students & Patrons
                          </span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Librarian Staff</span>
                          <p className="text-2xl font-black text-amber-600 mt-1">
                            {hubModal.analyticsData?.summary?.total_librarians || 0}
                          </p>
                          <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">
                            Assigned personnel
                          </span>
                        </div>
                      </div>

                      {/* Charts Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Category Breakdown (Pie Chart) */}
                        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                                  <FiPieChart className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">Collection Categories</h4>
                                  <p className="text-[11px] text-slate-500">Distribution of book genres and subjects</p>
                                </div>
                              </div>
                            </div>

                            {hubModal.analyticsData?.category_distribution?.length > 0 ? (
                              <div className="h-64 w-full mt-3">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={hubModal.analyticsData.category_distribution}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={50}
                                      outerRadius={80}
                                      paddingAngle={3}
                                      dataKey="count"
                                    >
                                      {hubModal.analyticsData.category_distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <RechartsTooltip
                                      formatter={(value, name) => [`${value} copies`, name]}
                                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            ) : (
                              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                                <FiBook className="w-8 h-8 text-slate-300 mb-2" />
                                <span>No cataloged books yet in this unit</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Circulation Trends (Area Chart) */}
                        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                                  <FiTrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">Circulation Activity</h4>
                                  <p className="text-[11px] text-slate-500">Monthly borrow vs return trend</p>
                                </div>
                              </div>
                            </div>

                            {hubModal.analyticsData?.circulation_trends?.length > 0 ? (
                              <div className="h-64 w-full mt-3">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={hubModal.analyticsData.circulation_trends}>
                                    <defs>
                                      <linearGradient id="hubColorBorrows" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                      </linearGradient>
                                      <linearGradient id="hubColorReturns" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    <Area type="monotone" dataKey="borrows" name="Borrows" stroke="#3B82F6" fillOpacity={1} fill="url(#hubColorBorrows)" />
                                    <Area type="monotone" dataKey="returns" name="Returns" stroke="#10B981" fillOpacity={1} fill="url(#hubColorReturns)" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            ) : (
                              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                                <FiActivity className="w-8 h-8 text-slate-300 mb-2" />
                                <span>No circulation transactions recorded yet</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Assigned Librarians Quick Strip with Email Button */}
                      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <FiShield className="text-blue-600" />
                            <span>On-Duty Librarians</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => setHubModal(prev => ({ ...prev, activeTab: 'librarians' }))}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800"
                          >
                            Manage Personnel →
                          </button>
                        </div>

                        {(!hubModal.analyticsData?.librarians || hubModal.analyticsData.librarians.length === 0) ? (
                          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                            <div className="text-xs text-amber-800">
                              <strong>No librarian currently assigned</strong> to this library unit.
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setHubUserForm(prev => ({ ...prev, user_type: 'librarian' }));
                                setHubModal(prev => ({ ...prev, activeTab: 'adduser' }));
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition"
                            >
                              + Assign Staff
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {hubModal.analyticsData?.librarians?.map(libUser => (
                              <div
                                key={libUser.user_id}
                                className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-2xs">
                                    {(libUser.firstname?.[0] || 'L') + (libUser.lastname?.[0] || '')}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {libUser.firstname} {libUser.lastname}
                                    </p>
                                    <p className="text-[11px] text-slate-500 truncate">{libUser.email}</p>
                                    <span className="text-[10px] font-semibold text-blue-700">
                                      {libUser.position || 'Unit Librarian'}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEmailModal(libUser, hubModal.library)}
                                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0 cursor-pointer"
                                  title="Send memo or email to this librarian"
                                >
                                  <FiMail className="w-3.5 h-3.5" />
                                  <span>Email Librarian</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PATRONS MONITORING */}
                  {hubModal.activeTab === 'patrons' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:w-72">
                          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Search patron by name, ID, or email..."
                            value={hubPatronSearch}
                            onChange={(e) => setHubPatronSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setHubUserForm(prev => ({ ...prev, user_type: 'student' }));
                            setHubModal(prev => ({ ...prev, activeTab: 'adduser' }));
                          }}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <FiUserPlus className="w-4 h-4" />
                          <span>+ Add Student Patron</span>
                        </button>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                        {(() => {
                          const patronsList = (hubModal.analyticsData?.patrons || []).filter(p => {
                            const q = hubPatronSearch.toLowerCase();
                            const matchName = `${p.firstname || ''} ${p.lastname || ''}`.toLowerCase().includes(q);
                            const matchEmail = (p.email || '').toLowerCase().includes(q);
                            const matchId = (p.student_number || '').toLowerCase().includes(q);
                            return matchName || matchEmail || matchId;
                          });

                          if (patronsList.length === 0) {
                            return (
                              <div className="text-center py-12 text-slate-400 text-xs">
                                <FiUsers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <span>No patrons found matching your search.</span>
                              </div>
                            );
                          }

                          return (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                                  <tr>
                                    <th className="px-4 py-3">Patron Name</th>
                                    <th className="px-4 py-3">Student / ID No.</th>
                                    <th className="px-4 py-3">Email Address</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Registered</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {patronsList.map(patron => (
                                    <tr key={patron.user_id} className="hover:bg-slate-50/70 transition">
                                      <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                                          {(patron.firstname?.[0] || 'P')}
                                        </div>
                                        <span>{patron.firstname} {patron.lastname}</span>
                                      </td>
                                      <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                                        {patron.student_number || '—'}
                                      </td>
                                      <td className="px-4 py-3 text-slate-600">{patron.email}</td>
                                      <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          patron.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                          {patron.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-slate-400 text-[11px]">
                                        {patron.created_at ? new Date(patron.created_at).toLocaleDateString() : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: ASSIGNED LIBRARIANS */}
                  {hubModal.activeTab === 'librarians' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Assigned Librarians</h3>
                          <p className="text-xs text-slate-500">Staff responsible for cataloging and circulation in {hubModal.library.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setHubUserForm(prev => ({ ...prev, user_type: 'librarian' }));
                            setHubModal(prev => ({ ...prev, activeTab: 'adduser' }));
                          }}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <FiUserPlus className="w-4 h-4" />
                          <span>+ Add Librarian Staff</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(hubModal.analyticsData?.librarians || []).map(libUser => (
                          <div
                            key={libUser.user_id}
                            className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                                {(libUser.firstname?.[0] || 'L') + (libUser.lastname?.[0] || '')}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 truncate">
                                  {libUser.firstname} {libUser.lastname}
                                </h4>
                                <p className="text-xs text-slate-500 truncate">{libUser.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="inline-block px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-100">
                                    {libUser.position || 'Unit Librarian'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ID: {libUser.employee_number || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleOpenEmailModal(libUser, hubModal.library)}
                                className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <FiMail className="w-3.5 h-3.5" />
                                <span>Email Librarian</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAssignLibrarian(libUser.user_id, null)}
                                className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 font-bold text-xs transition cursor-pointer"
                                title="Unassign from this unit"
                              >
                                <span>Unassign</span>
                              </button>
                            </div>
                          </div>
                        ))}

                        {(!hubModal.analyticsData?.librarians || hubModal.analyticsData.librarians.length === 0) && (
                          <div className="col-span-full text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs">
                            No librarians assigned to this unit yet. Click "+ Add Librarian Staff" above.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: ADD USER DIRECTLY TO LIBRARY */}
                  {hubModal.activeTab === 'adduser' && (
                    <form onSubmit={handleSubmitHubAddUser} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs max-w-xl mx-auto space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Add User to {hubModal.library.name}</h3>
                          <p className="text-xs text-slate-500">Automatically bound to this library unit</p>
                        </div>
                        {/* Toggle User Type */}
                        <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setHubUserForm(prev => ({ ...prev, user_type: 'student', role_id: 4 }))}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              hubUserForm.user_type === 'student' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Student Patron
                          </button>
                          <button
                            type="button"
                            onClick={() => setHubUserForm(prev => ({ ...prev, user_type: 'librarian', role_id: 3 }))}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              hubUserForm.user_type === 'librarian' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Librarian Staff
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">First Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Maria"
                            value={hubUserForm.firstname}
                            onChange={(e) => setHubUserForm(prev => ({ ...prev, firstname: e.target.value }))}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Last Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Santos"
                            value={hubUserForm.lastname}
                            onChange={(e) => setHubUserForm(prev => ({ ...prev, lastname: e.target.value }))}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          placeholder="user@institution.edu.ph"
                          value={hubUserForm.email}
                          onChange={(e) => setHubUserForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {hubUserForm.user_type === 'student' ? (
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Student / LRN Number</label>
                          <input
                            type="text"
                            placeholder="e.g. 2026-00123"
                            value={hubUserForm.student_number}
                            onChange={(e) => setHubUserForm(prev => ({ ...prev, student_number: e.target.value }))}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Employee Number</label>
                            <input
                              type="text"
                              placeholder="e.g. EMP-998"
                              value={hubUserForm.employee_number}
                              onChange={(e) => setHubUserForm(prev => ({ ...prev, employee_number: e.target.value }))}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Position / Title</label>
                            <input
                              type="text"
                              placeholder="e.g. Unit Librarian"
                              value={hubUserForm.position}
                              onChange={(e) => setHubUserForm(prev => ({ ...prev, position: e.target.value }))}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
                        <input
                          type="text"
                          value={hubUserForm.password}
                          onChange={(e) => setHubUserForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Auto-generated if left blank"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 font-mono focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">A secure temporary password is automatically provided.</span>
                      </div>

                      <div className="pt-3">
                        <button
                          type="submit"
                          disabled={hubUserForm.submitting}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                        >
                          {hubUserForm.submitting ? 'Registering user...' : `Register ${hubUserForm.user_type === 'librarian' ? 'Librarian' : 'Patron'}`}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EMAIL LIBRARIAN MODAL ── */}
      {emailModal.isOpen && emailModal.librarian && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            {/* Email Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <FiMail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Email Assigned Librarian</h3>
                  <p className="text-xs text-slate-500">Official memorandum & direct notice</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmailMemo} className="p-6 space-y-4">
              {/* Recipient info pill */}
              <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {(emailModal.librarian.firstname?.[0] || 'L')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {emailModal.librarian.firstname} {emailModal.librarian.lastname}
                    </p>
                    <p className="text-[11px] text-blue-700 font-mono truncate">{emailModal.librarian.email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  {emailModal.library?.name || 'Assigned Unit'}
                </span>
              </div>

              {/* Priority Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notice Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'normal', label: 'Normal', color: 'border-slate-200 bg-white text-slate-700' },
                    { id: 'important', label: 'Important', color: 'border-amber-200 bg-amber-50/50 text-amber-800' },
                    { id: 'urgent', label: 'Urgent Action', color: 'border-rose-200 bg-rose-50/50 text-rose-800' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setEmailModal(prev => ({ ...prev, priority: p.id }))}
                      className={`py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        emailModal.priority === p.id ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-300 text-blue-800' : p.color
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={emailModal.subject}
                  onChange={(e) => setEmailModal(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Message Content *</label>
                <textarea
                  rows={5}
                  required
                  value={emailModal.message}
                  onChange={(e) => setEmailModal(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleOpenMailClient}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
                  title="Open default email application like Gmail or Outlook"
                >
                  <FiExternalLink className="w-3.5 h-3.5" />
                  <span>Open Mail App</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={emailModal.sending}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <FiSend className="w-3.5 h-3.5" />
                    <span>{emailModal.sending ? 'Sending...' : 'Send Official Memo'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DEDICATED SECURITY DELETE CONFIRMATION MODAL ── */}
      {deleteModal.isOpen && deleteModal.library && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden my-8">
            {/* Red Accent Header Banner */}
            <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-rose-600 p-6 text-white text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/15 via-transparent to-transparent" />
              <div className="relative mx-auto w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-3 shadow-inner">
                <FiTrash2 className="w-7 h-7 text-rose-100" />
              </div>
              <h3 className="text-lg font-black tracking-tight text-white">
                Delete Library Unit
              </h3>
              <p className="text-xs text-rose-100 mt-1 max-w-xs mx-auto">
                Admin-Librarian Authentication Required
              </p>
            </div>

            <form onSubmit={handleConfirmDelete} className="p-6 space-y-4">
              {/* Library Details Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeProps(deleteModal.library.library_type).badgeClass}`}>
                    {getBadgeProps(deleteModal.library.library_type).label}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    ID #{deleteModal.library.library_id}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {deleteModal.library.name}
                </h4>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                  <span>📚 {deleteModal.library.total_books || 0} Books</span>
                  <span>•</span>
                  <span>👥 {deleteModal.library.total_students || 0} Patrons</span>
                  <span>•</span>
                  <span>🛡️ {deleteModal.library.total_librarians || 0} Staff</span>
                </div>
              </div>

              {/* Safety Warning */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Smart Deletion Protection</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-700">
                  If this unit contains existing catalog books or enrolled patrons, it will be <strong>safely marked as Inactive</strong> to protect your borrow history. If it is completely empty, it will be permanently deleted.
                </p>
              </div>

              {/* Error Alert */}
              {deleteModal.error && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <FiAlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{deleteModal.error}</span>
                </div>
              )}

              {/* Password Input Field */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Confirm Admin Password *
                </label>
                <div className="relative">
                  <input
                    type={deleteModal.showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your current admin password"
                    value={deleteModal.password}
                    onChange={(e) => setDeleteModal(prev => ({ ...prev, password: e.target.value, error: null }))}
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-rose-500 focus:outline-none transition font-medium"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setDeleteModal(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    tabIndex={-1}
                  >
                    {deleteModal.showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Type the password of your currently logged-in account to confirm this critical operation.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={deleteModal.submitting}
                  onClick={() => setDeleteModal({ isOpen: false, library: null, password: '', showPassword: false, submitting: false, error: null })}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteModal.submitting || !deleteModal.password.trim()}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 rounded-xl shadow-md shadow-rose-500/20 transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {deleteModal.submitting ? (
                    <>
                      <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="w-3.5 h-3.5" />
                      <span>Verify & Delete</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
