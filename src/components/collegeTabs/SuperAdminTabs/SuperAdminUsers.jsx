import { useState, useEffect, useMemo } from 'react';
import { 
  FiUsers, FiFilter, FiEdit, FiTrash2, FiPlus, FiSearch, 
  FiCheck, FiX, FiGrid, FiList, FiArchive, FiGlobe, 
  FiRefreshCw, FiUserCheck, FiShield, FiMail, FiPhone
} from 'react-icons/fi';
import api, { getBackendAssetUrl } from '../../../utils/api';
import { ConfirmationOverlay, LoadingOverlay } from '../../common';
import useAlert from '../../../hooks/useAlert';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import EmptyState from '../../ui/EmptyState';

// Profile Avatar Component with Image & Role-Based Fallback
function UserAvatar({ user, size = "md" }) {
  const [imgErr, setImgErr] = useState(false);
  const avatarPath = user?.profile_image || user?.profile_picture;
  const avatarUrl = avatarPath ? getBackendAssetUrl(avatarPath) : null;
  const initials = `${user?.firstname?.[0] || ''}${user?.lastname?.[0] || ''}`.toUpperCase() || (user?.email?.[0] || 'U').toUpperCase();

  const sizeClasses = {
    sm: "w-8 h-8 rounded-lg text-xs",
    md: "w-10 h-10 rounded-xl text-sm",
    lg: "w-12 h-12 rounded-2xl text-base"
  }[size] || "w-10 h-10 rounded-xl text-sm";

  const role = user?.role_name || user?.role || '';
  const bgGradient = role.includes('Super') 
    ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white'
    : role.includes('Admin')
    ? 'bg-gradient-to-br from-blue-600 to-cyan-700 text-white'
    : role.includes('Librarian')
    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
    : 'bg-gradient-to-br from-slate-600 to-slate-800 text-white';

  if (avatarUrl && !imgErr) {
    return (
      <div className={`${sizeClasses} overflow-hidden shadow-xs border border-slate-200/80 shrink-0 bg-slate-100 flex items-center justify-center`}>
        <img 
          src={avatarUrl} 
          alt="" 
          className="w-full h-full object-cover" 
          onError={() => setImgErr(true)} 
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} ${bgGradient} flex items-center justify-center font-bold tracking-tight shadow-xs border border-white/20 shrink-0 select-none`}>
      {initials}
    </div>
  );
}

function SuperAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterArchive, setFilterArchive] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ 
    firstname: '', 
    lastname: '', 
    email: '', 
    role_id: '4', 
    school_id: '', 
    password: '', 
    student_number: '', 
    employee_number: '', 
    gender: '', 
    contact_number: '' 
  });
  const [schools, setSchools] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useAlert();

  useEffect(() => {
    fetchUsers();
    fetchSchools();
  }, []);

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/users');
      const list = response.data || (Array.isArray(response) ? response : []);
      setUsers(list);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Failed to load users directory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      const list = response.data || (Array.isArray(response) ? response : []);
      setSchools(list);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesRole = filterRole === 'all' || user.role_name === filterRole;
      const matchesArchive = filterArchive === 'all' || 
        (filterArchive === 'active' && !user.is_archived) || 
        (filterArchive === 'archived' && user.is_archived);
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        user.firstname?.toLowerCase().includes(q) ||
        user.lastname?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.student_number?.toLowerCase().includes(q) ||
        user.employee_number?.toLowerCase().includes(q) ||
        user.school_code?.toLowerCase().includes(q);

      return matchesRole && matchesArchive && matchesSearch;
    });
  }, [users, filterRole, filterArchive, searchQuery]);

  const resetForm = () => {
    setFormData({ 
      firstname: '', 
      lastname: '', 
      email: '', 
      role_id: '4', 
      school_id: schools[0]?.school_id || '', 
      password: '', 
      student_number: '', 
      employee_number: '', 
      gender: '', 
      contact_number: '' 
    });
  };

  const buildUserPayload = (isEdit = false) => {
    const payload = {
      firstname: formData.firstname.trim(),
      lastname: formData.lastname.trim(),
      email: formData.email.trim(),
      role_id: formData.role_id ? Number(formData.role_id) : null,
      school_id: formData.school_id ? Number(formData.school_id) : null,
      student_number: formData.student_number?.trim() || null,
      employee_number: formData.employee_number?.trim() || null,
      gender: formData.gender?.trim() || null,
      contact_number: formData.contact_number?.trim() || null,
      status: 'active',
    };

    if (!isEdit && !formData.password.trim()) {
      throw new Error('Please enter a password for the new user.');
    }

    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    return payload;
  };

  const handleAddUser = async (e) => {
    e?.preventDefault();
    try {
      setSubmitting(true);
      const payload = buildUserPayload(false);

      if (!payload.firstname || !payload.lastname || !payload.email || !payload.role_id || !payload.school_id) {
        showError('Please complete all required fields.');
        return;
      }

      const response = await api.post('/users', payload);
      if (response && response.success) {
        showSuccess('User onboarded successfully!');
        setShowAddModal(false);
        resetForm();
        await fetchUsers();
      } else {
        showError(response?.message || 'Failed to add user.');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      showError(error?.data?.message || error?.message || 'Failed to add user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      firstname: user.firstname || '',
      lastname: user.lastname || '',
      email: user.email || '',
      role_id: user.role_id ? String(user.role_id) : '4',
      school_id: user.school_id ? String(user.school_id) : '',
      password: '',
      student_number: user.student_number || '',
      employee_number: user.employee_number || '',
      gender: user.gender || '',
      contact_number: user.contact_number || '',
    });
    setShowAddModal(true);
  };

  const handleUpdateUser = async (e) => {
    e?.preventDefault();
    if (!editingUser) return;
    try {
      setSubmitting(true);
      const payload = buildUserPayload(true);

      const response = await api.put(`/users/${editingUser.user_id}`, payload);
      if (response && response.success) {
        showSuccess('User updated successfully!');
        setShowAddModal(false);
        setEditingUser(null);
        resetForm();
        await fetchUsers();
      } else {
        showError(response?.message || 'Failed to update user.');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showError(error?.data?.message || error?.message || 'Failed to update user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const isCurrentlyActive = user.status?.toLowerCase() === 'active';
      const newStatus = isCurrentlyActive ? 'inactive' : 'active';
      const response = await api.patch(`/users/${user.user_id}/status`, { status: newStatus });
      if (response && response.success) {
        showSuccess(`User marked as ${newStatus}!`);
        await fetchUsers();
      } else {
        showError(response?.message || 'Failed to update status.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Failed to change user status.');
    }
  };

  const handleArchiveUser = async (user) => {
    try {
      const response = await api.patch(`/users/${user.user_id}/archive`, { is_archived: !user.is_archived });
      if (response && response.success) {
        showSuccess(user.is_archived ? 'User unarchived!' : 'User archived!');
        await fetchUsers();
      } else {
        showError(response?.message || 'Failed to update archive status.');
      }
    } catch (error) {
      console.error('Error archiving user:', error);
      showError('Failed to update archive status.');
    }
  };

  const totalUsersCount = users.length;
  const studentsCount = users.filter(u => u.role_name === 'Student').length;
  const staffCount = users.filter(u => u.role_name === 'Librarian' || u.role_name === 'Admin').length;

  return (
    <div className="space-y-6 animate-slide-up pb-12">
      <LoadingOverlay show={loading} text="Loading consortium directory..." />

      {/* ─────────────────────────────────────────────────────────────
          1. CONSORTIUM USERS HERO BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/40">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold tracking-wide border border-blue-400/30 mb-2">
              <FiUsers className="w-3.5 h-3.5 text-blue-400" />
              Consortium Identity & Access Management
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              Consortium User Directory
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Cross-campus authentication, student credentials, and librarian administrative delegations across the Libralink consortium.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              disabled={refreshing}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
              title="Refresh Directory"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Button
              onClick={() => {
                setEditingUser(null);
                resetForm();
                setShowAddModal(true);
              }}
              className="!bg-blue-600 hover:!bg-blue-500 !text-white !font-semibold !rounded-xl !px-4 !py-2.5 !shadow-lg !shadow-blue-600/30 flex items-center gap-2 text-xs"
            >
              <FiPlus className="w-4 h-4" />
              Onboard User
            </Button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SUMMARY KPI CHIPS (Clean White Surfaces)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Accounts</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{totalUsersCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FiUsers className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students</span>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">{studentsCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FiUserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Librarians & Admins</span>
            <div className="text-xl font-bold text-purple-600 mt-0.5">{staffCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FiShield className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campuses</span>
            <div className="text-xl font-bold text-blue-600 mt-0.5">{schools.length}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FiGlobe className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CONTROLS: SEARCH, FILTERS & VIEW MODE (Clean White Surface)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <FiSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, student #, campus..."
            className="w-full pl-10 pr-9 py-2 rounded-xl text-sm border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role filter */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            {['all', 'Admin', 'Librarian', 'Student'].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={`px-3 py-1 font-semibold rounded-lg transition-all ${
                  filterRole === r
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === 'Admin' ? 'Admin-Lib' : r === 'all' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          {/* Archive filter */}
          <select
            value={filterArchive}
            onChange={(e) => setFilterArchive(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700"
          >
            <option value="active">Active Accounts</option>
            <option value="archived">Archived Only</option>
            <option value="all">All States</option>
          </select>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* View Mode */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'card'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card View"
            >
              <FiGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="List View"
            >
              <FiList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. USERS DISPLAY (Clean White Cards)
      ───────────────────────────────────────────────────────────── */}
      {filteredUsers.length === 0 ? (
        <Card padding="lg" className="text-center py-16">
          <EmptyState
            icon={<FiUsers className="w-14 h-14 text-slate-300 mx-auto" />}
            title="No matching users found"
            description="Try changing your search terms or role filters."
            action={{
              label: 'Reset Filters',
              onClick: () => {
                setSearchQuery('');
                setFilterRole('all');
                setFilterArchive('active');
              }
            }}
          />
        </Card>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const initials = `${user.firstname?.[0] || ''}${user.lastname?.[0] || ''}`.toUpperCase() || 'U';
            const isActive = user.status?.toLowerCase() === 'active';
            const role = user.role_name === 'Admin' ? 'Admin-Librarian' : user.role_name;

            return (
              <div
                key={user.user_id}
                className={`group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between ${
                  user.is_archived ? 'opacity-60 bg-slate-50' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} size="lg" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            {user.school_code || 'Consortium'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            #{user.user_id}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mt-1 leading-snug">
                          {user.firstname} {user.lastname}
                        </h3>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isActive 
                            ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' 
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={isActive ? 'Deactivate account' : 'Activate account'}
                      >
                        {isActive ? <FiX className="w-3.5 h-3.5" /> : <FiCheck className="w-3.5 h-3.5 text-emerald-500" />}
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit user details"
                      >
                        <FiEdit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleArchiveUser(user)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.is_archived 
                            ? 'text-orange-500 hover:bg-orange-50' 
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                        title={user.is_archived ? 'Unarchive' : 'Archive'}
                      >
                        <FiArchive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 mb-3">
                    <div className="flex items-center gap-2">
                      <FiMail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.contact_number && (
                      <div className="flex items-center gap-2">
                        <FiPhone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{user.contact_number}</span>
                      </div>
                    )}
                    {(user.student_number || user.employee_number) && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        {user.student_number ? `Student ID: ${user.student_number}` : `Emp ID: ${user.employee_number}`}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    role === 'Super Admin' 
                      ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                      : role?.includes('Admin') 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : role === 'Librarian'
                      ? 'bg-orange-50 text-orange-700 border border-orange-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {role}
                  </span>

                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                    isActive ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 uppercase font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">User Identity</th>
                  <th className="px-4 py-3.5">Role & Scope</th>
                  <th className="px-4 py-3.5">Campus Node</th>
                  <th className="px-4 py-3.5">Identification</th>
                  <th className="px-4 py-3.5 text-center">Account Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const isActive = user.status?.toLowerCase() === 'active';
                  const role = user.role_name === 'Admin' ? 'Admin-Librarian' : user.role_name;

                  return (
                    <tr key={user.user_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} size="md" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs leading-tight flex items-center gap-1.5 truncate max-w-xs">
                              <span>{user.firstname} {user.lastname}</span>
                              {user.is_archived && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Archived
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                              {user.email || 'No email registered'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          role?.includes('Super')
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : role?.includes('Admin')
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : role === 'Librarian'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          <FiShield className="w-3 h-3 opacity-70" />
                          <span>{role}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {user.school_code || 'ALL'}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[130px]" title={user.school_name}>
                            {user.school_name || 'Consortium Wide'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        {user.student_number || user.employee_number || '—'}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit user details"
                          >
                            <FiEdit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(user)}
                            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              isActive 
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' 
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={isActive ? 'Deactivate account' : 'Activate account'}
                          >
                            {isActive ? <FiX className="w-3.5 h-3.5" /> : <FiCheck className="w-3.5 h-3.5 text-emerald-500" />}
                          </button>
                          <button
                            onClick={() => handleArchiveUser(user)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              user.is_archived 
                                ? 'text-orange-500 hover:bg-orange-50' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                            }`}
                            title={user.is_archived ? 'Unarchive' : 'Archive'}
                          >
                            <FiArchive className="w-3.5 h-3.5" />
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
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. ONBOARD / EDIT USER MODAL
      ───────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingUser(null);
          }}
          title={editingUser ? `Update Account: ${editingUser.firstname} ${editingUser.lastname}` : 'Onboard Consortium User'}
          description="Assign institutional campus, role delegations, and credentials."
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={editingUser ? handleUpdateUser : handleAddUser}
                disabled={submitting}
                className="!bg-blue-600 hover:!bg-blue-500 !text-white flex items-center gap-2"
              >
                {submitting && <FiRefreshCw className="w-4 h-4 animate-spin" />}
                {editingUser ? 'Save Changes' : 'Create User Account'}
              </Button>
            </div>
          }
        >
          <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstname}
                  onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                  placeholder="First name"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastname}
                  onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                  placeholder="Last name"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@school.edu.ph"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {editingUser ? 'Password (leave blank to keep)' : 'Initial Password *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? '••••••••' : 'Enter strong password'}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Consortium Campus *
                </label>
                <select
                  required
                  value={formData.school_id}
                  onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Select Campus</option>
                  {schools.map((school) => (
                    <option key={school.school_id} value={school.school_id}>
                      {school.school_name} ({school.school_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Role Delegation *
                </label>
                <select
                  required
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="4">Student</option>
                  <option value="3">Librarian</option>
                  <option value="2">Admin-Librarian</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Student Number
                </label>
                <input
                  type="text"
                  value={formData.student_number}
                  onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                  placeholder="e.g. 2026-10293"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Employee Number
                </label>
                <input
                  type="text"
                  value={formData.employee_number}
                  onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                  placeholder="e.g. EMP-9921"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  placeholder="+63 912 345 6789"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-900"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default SuperAdminUsers;
