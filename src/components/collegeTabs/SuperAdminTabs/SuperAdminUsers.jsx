import { useState, useEffect } from 'react';
import { FiUsers, FiFilter, FiEdit, FiTrash2, FiPlus, FiSearch, FiCheck, FiX, FiGrid, FiList, FiArchive } from 'react-icons/fi';
import api from '../../../utils/api';
import { ConfirmationOverlay, LoadingOverlay, AlertOverlay } from '../../common';
import useAlert from '../../../hooks/useAlert';
import { PageHeader, Button, Card, Input, Select, Modal, StatusBadge, EmptyState, DataTable, SearchBar, IconButton } from '../../ui';

function SuperAdminUsers({ darkMode }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ firstname: '', lastname: '', email: '', role_id: '', school_id: '', password: '', student_number: '', employee_number: '', gender: '', contact_number: '' });
  const [schools, setSchools] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const [filterArchive, setFilterArchive] = useState('active');
  const [submitting, setSubmitting] = useState(false);
  const { alert, showSuccess, showError, hideAlert } = useAlert();

  useEffect(() => {
    fetchUsers();
    fetchSchools();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      const response = await api.get('/users');
      console.log('Users response:', response);
      setUsers(response.data || []);
      setLoading(false);
      console.log('Loading set to false, users:', response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = filterRole === 'all' || user.role_name === filterRole;
    const matchesArchive = filterArchive === 'all' || 
      (filterArchive === 'active' && !user.is_archived) || 
      (filterArchive === 'archived' && user.is_archived);
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      user.firstname?.toLowerCase().includes(searchLower) ||
      user.lastname?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower);
    return matchesRole && matchesArchive && matchesSearch;
  });

  const resetForm = () => {
    setFormData({ firstname: '', lastname: '', email: '', role_id: '4', school_id: '', password: '', student_number: '', employee_number: '', gender: '', contact_number: '' });
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

    console.log('Built payload:', payload);
    console.log('Role ID in payload:', payload.role_id, 'Type:', typeof payload.role_id);

    return payload;
  };

  const handleAddUser = async () => {
    try {
      setSubmitting(true);

      const payload = buildUserPayload(false);
      if (!payload.firstname || !payload.lastname || !payload.email || !payload.role_id || !payload.school_id) {
        throw new Error('Please fill in all required fields before creating the user.');
      }

      console.log('Creating user with payload:', payload);
      console.log('Role ID being sent:', payload.role_id);

      await api.post('/users', payload);
      await fetchUsers();
      setShowAddModal(false);
      resetForm();
      showSuccess('User added successfully.');
    } catch (error) {
      console.error('Error adding user:', error);
      showError(error?.message || 'Failed to add user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role_id: user.role_id,
      school_id: user.school_id,
      password: '',
      student_number: user.student_number || '',
      employee_number: user.employee_number || '',
      gender: user.gender || '',
      contact_number: user.contact_number || ''
    });
    setShowAddModal(true);
  };

  const handleUpdateUser = async () => {
    try {
      setSubmitting(true);

      const payload = buildUserPayload(true);
      if (!payload.firstname || !payload.lastname || !payload.email || !payload.role_id || !payload.school_id) {
        throw new Error('Please fill in all required fields before updating the user.');
      }

      await api.put(`/users/${editingUser.user_id}`, payload);
      await fetchUsers();
      setShowAddModal(false);
      setEditingUser(null);
      resetForm();
      showSuccess('User updated successfully.');
    } catch (error) {
      console.error('Error updating user:', error);
      showError(error?.message || 'Failed to update user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await api.put(`/users/${user.user_id}`, { ...user, status: newStatus });
      await fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleArchiveUser = async (user) => {
    try {
      const newArchiveStatus = !(user.is_archived === true);
      await api.put(`/users/${user.user_id}`, { is_archived: newArchiveStatus });
      await fetchUsers();
      showSuccess(newArchiveStatus ? 'User archived successfully!' : 'User unarchived successfully!');
    } catch (error) {
      console.error('Error archiving user:', error);
      showError('Failed to archive user. Please try again.');
    }
  };

  return (
    <div className="animate-slide-up relative pointer-events-auto">
      <LoadingOverlay show={loading} text="Loading users..." />
      
      <PageHeader
        title="User Management"
        description="Manage all users across the system"
        actions={[
          { label: 'Add User', onClick: () => setShowAddModal(true), variant: 'primary' }
        ]}
      />

      {/* Filter Section */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50">
            <FiFilter className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Filter by Role:</span>
          </div>
          <Select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'Admin', label: 'Admin-librarian' },
              { value: 'Librarian', label: 'Librarian' },
              { value: 'Student', label: 'Student' },
            ]}
          />

          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50">
            <FiArchive className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Archive:</span>
          </div>
          <Select
            value={filterArchive}
            onChange={(e) => setFilterArchive(e.target.value)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
              { value: 'all', label: 'All' },
            ]}
          />
          
          <div className="flex-1 w-full sm:w-auto">
            <SearchBar
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
            />
          </div>

          <div className="flex items-center gap-2">
            <IconButton
              icon={<FiGrid className="w-4 h-4" />}
              onClick={() => setViewMode('card')}
              variant={viewMode === 'card' ? 'primary' : 'ghost'}
              title="Card View"
            />
            <IconButton
              icon={<FiList className="w-4 h-4" />}
              onClick={() => setViewMode('list')}
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              title="List View"
            />
          </div>
        </div>
      </Card>
      
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.user_id} padding="md" className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FiUsers className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <IconButton
                    icon={user.status?.toLowerCase() === 'active' ? <FiX className="w-4 h-4" /> : <FiCheck className="w-4 h-4" />}
                    onClick={() => handleToggleUserStatus(user)}
                    variant={user.status?.toLowerCase() === 'active' ? 'ghost' : 'ghost'}
                    className={user.status?.toLowerCase() === 'active' ? 'text-amber-600' : 'text-green-600'}
                    title={user.status?.toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}
                  />
                  <IconButton
                    icon={<FiEdit className="w-4 h-4" />}
                    onClick={() => handleEditUser(user)}
                    variant="ghost"
                  />
                  <IconButton
                    icon={<FiArchive className="w-4 h-4" />}
                    onClick={() => handleArchiveUser(user)}
                    variant={user.is_archived ? 'ghost' : 'ghost'}
                    className={user.is_archived ? 'text-orange-600' : 'text-slate-600'}
                    title={user.is_archived ? 'Unarchive' : 'Archive'}
                  />
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-1 text-slate-900">{user.firstname} {user.lastname}</h3>
              <p className="text-sm mb-3 text-slate-600">{user.email}</p>

              <div className="flex flex-wrap gap-2 mb-3">
                <StatusBadge status={user.role_name === 'Admin' ? 'Admin-librarian' : user.role_name} variant="info" />
                <StatusBadge status={user.school_code} variant="neutral" />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <StatusBadge status={user.status} variant={user.status?.toLowerCase() === 'active' ? 'success' : 'error'} />
                <span className="text-xs text-slate-500">
                  ID: {user.user_id}
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <DataTable
          columns={[
            { header: 'User', accessor: 'user', cell: (row) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiUsers className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">{row.firstname} {row.lastname}</div>
                  <div className="text-sm text-slate-600">{row.email}</div>
                </div>
              </div>
            )},
            { header: 'Role', accessor: 'role_name', cell: (row) => <StatusBadge status={row.role_name === 'Admin' ? 'Admin-librarian' : row.role_name} variant="info" /> },
            { header: 'School', accessor: 'school_code', cell: (row) => <span className="text-sm text-slate-700">{row.school_code}</span> },
            { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} variant={row.status?.toLowerCase() === 'active' ? 'success' : 'error'} /> },
            { header: 'ID', accessor: 'user_id', cell: (row) => <span className="text-sm text-slate-500">{row.user_id}</span> },
            { header: 'Actions', cell: (row) => (
              <div className="flex items-center justify-end gap-2">
                <IconButton
                  icon={row.status?.toLowerCase() === 'active' ? <FiX className="w-4 h-4" /> : <FiCheck className="w-4 h-4" />}
                  onClick={() => handleToggleUserStatus(row)}
                  variant="ghost"
                  className={row.status?.toLowerCase() === 'active' ? 'text-amber-600' : 'text-green-600'}
                  title={row.status?.toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}
                />
                <IconButton icon={<FiEdit className="w-4 h-4" />} onClick={() => handleEditUser(row)} variant="ghost" />
                <IconButton
                  icon={<FiArchive className="w-4 h-4" />}
                  onClick={() => handleArchiveUser(row)}
                  variant="ghost"
                  className={row.is_archived ? 'text-orange-600' : 'text-slate-600'}
                  title={row.is_archived ? 'Unarchive' : 'Archive'}
                />
              </div>
            )},
          ]}
          data={filteredUsers}
        />
      )}

      {filteredUsers.length === 0 && !loading && (
        <EmptyState
          icon={<FiUsers className="w-10 h-10" />}
          title="No users found"
          description="Try adjusting your filter or add a new user"
          action={{ label: 'Add User', onClick: () => setShowAddModal(true) }}
        />
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingUser(null);
          resetForm();
        }}
        title={editingUser ? 'Edit User' : 'Add New User'}
        description={editingUser ? 'Update user information' : 'Fill in the user details below'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowAddModal(false);
              setEditingUser(null);
              resetForm();
            }} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={editingUser ? handleUpdateUser : handleAddUser} disabled={submitting}>
              {submitting ? (editingUser ? 'Updating...' : 'Adding...') : (editingUser ? 'Update User' : 'Add User')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name *"
            placeholder="First name"
            value={formData.firstname}
            onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
          />

          <Input
            label="Last Name *"
            placeholder="Last name"
            value={formData.lastname}
            onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
          />

          <div className="md:col-span-2">
            <Input
              label="Email *"
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <Select
            label="Role *"
            value={formData.role_id}
            onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
            options={[
              { value: '', label: 'Select Role' },
              { value: '2', label: 'Admin-librarian' },
              { value: '3', label: 'Librarian' },
              { value: '4', label: 'Student' },
            ]}
          />

          <Select
            label="School *"
            value={formData.school_id}
            onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
            options={[
              { value: '', label: 'Select School' },
              ...schools.map((school) => ({ value: school.school_id, label: `${school.school_name} (${school.school_code})` }))
            ]}
          />

          <Input
            label="Student Number"
            placeholder="For students"
            value={formData.student_number}
            onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
          />

          <Input
            label="Employee Number"
            placeholder="For librarians/admins"
            value={formData.employee_number}
            onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
          />

          <Select
            label="Gender"
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            options={[
              { value: '', label: 'Select Gender' },
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
              { value: 'Other', label: 'Other' },
            ]}
          />

          <Input
            label="Contact Number"
            placeholder="Phone number"
            value={formData.contact_number}
            onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
          />

          <div className="md:col-span-2">
            <Input
              label={`Password ${editingUser ? '(leave blank to keep current)' : '*'}`}
              type="password"
              placeholder={editingUser ? 'New password (optional)' : 'Enter password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
        </div>
      </Modal>


      <AlertOverlay
        show={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={hideAlert}
      />
    </div>
  );
}

export default SuperAdminUsers;
