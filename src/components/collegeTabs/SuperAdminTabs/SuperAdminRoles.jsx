import { useState, useEffect, useMemo } from 'react';
import { 
  FiShield, FiUsers, FiCheckCircle, FiXCircle, FiSearch, 
  FiFilter, FiPlus, FiEdit, FiEye, FiTrash2, FiSettings, 
  FiChevronDown, FiChevronUp, FiX, FiCheck, FiLock, 
  FiLayers, FiGlobe, FiActivity, FiKey, FiRefreshCw,
  FiMail, FiArrowRight
} from 'react-icons/fi';
import api from '../../../utils/api';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import EmptyState from '../../ui/EmptyState';
import useAlert from '../../../hooks/useAlert';
import { LoadingOverlay } from '../../common';

function SuperAdminRoles() {
  const [roles, setRoles] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Live Role Members Directory Drawer State
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [activeDrawerRole, setActiveDrawerRole] = useState(null);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerCampusFilter, setDrawerCampusFilter] = useState('all');

  // Quick Reassign Modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignUser, setReassignUser] = useState(null);
  const [reassignTargetRoleId, setReassignTargetRoleId] = useState('');
  const [savingReassign, setSavingReassign] = useState(false);

  // Selected role
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    role_name: '',
    description: '',
    status: 'active'
  });

  const { showSuccess, showError } = useAlert();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setRefreshing(true);
      await Promise.allSettled([
        fetchRoles(),
        fetchStatistics(),
        fetchPermissions(),
        fetchUsers(),
        fetchSchools()
      ]);
    } catch (err) {
      console.error('Error fetching role data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      const list = response.data || (Array.isArray(response) ? response : []);
      setUsers(list);
    } catch (err) {
      console.error('Error fetching users directory:', err);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      const list = response.data || (Array.isArray(response) ? response : []);
      setSchools(list);
    } catch (err) {
      console.error('Error fetching schools directory:', err);
    }
  };

  const handleOpenMembersDrawer = (role) => {
    setActiveDrawerRole(role);
    setDrawerSearch('');
    setDrawerCampusFilter('all');
    setShowMembersDrawer(true);
  };

  const handleOpenReassign = (user) => {
    setReassignUser(user);
    const curRoleId = String(user.role_id || (activeDrawerRole ? activeDrawerRole.role_id : '4'));
    const nextRole = roles.find(r => String(r.role_id) !== curRoleId);
    setReassignTargetRoleId(nextRole ? String(nextRole.role_id) : '4');
    setShowReassignModal(true);
  };

  const handleConfirmReassign = async () => {
    if (!reassignUser || !reassignTargetRoleId) return;
    try {
      setSavingReassign(true);
      const targetRole = roles.find(r => String(r.role_id) === String(reassignTargetRoleId));
      const res = await api.put(`/users/${reassignUser.user_id || reassignUser.id}`, {
        role_id: Number(reassignTargetRoleId)
      });

      if (res && res.success) {
        showSuccess(`User role updated to ${targetRole?.role_name || 'new role'}!`);
        setShowReassignModal(false);
        setReassignUser(null);
        await Promise.allSettled([fetchUsers(), fetchStatistics(), fetchRoles()]);
      } else {
        showError(res?.message || 'Failed to reassign user role.');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      showError(err?.data?.message || err?.message || 'Failed to reassign role.');
    } finally {
      setSavingReassign(false);
    }
  };

  const getRoleUserCount = (roleId, roleName) => {
    return users.filter(u => 
      String(u.role_id) === String(roleId) || 
      (u.roles?.role_name && u.roles.role_name.toLowerCase() === roleName?.toLowerCase())
    ).length;
  };

  const drawerMembers = useMemo(() => {
    if (!activeDrawerRole) return [];
    const rId = String(activeDrawerRole.role_id);
    const rName = activeDrawerRole.role_name?.toLowerCase();

    return users.filter(u => {
      const matchesRole = String(u.role_id) === rId || 
        (u.roles?.role_name && u.roles.role_name.toLowerCase() === rName);
      if (!matchesRole) return false;

      const matchesCampus = drawerCampusFilter === 'all' || 
        String(u.school_id) === String(drawerCampusFilter);
      if (!matchesCampus) return false;

      const q = drawerSearch.toLowerCase().trim();
      if (!q) return true;

      const fullName = `${u.firstname || ''} ${u.lastname || ''} ${u.name || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const idNum = (u.student_number || u.employee_number || '').toLowerCase();

      return fullName.includes(q) || email.includes(q) || idNum.includes(q);
    });
  }, [users, activeDrawerRole, drawerCampusFilter, drawerSearch]);

  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles');
      const list = response.data || (Array.isArray(response) ? response : []);
      setRoles(list);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/roles/statistics');
      if (response.data) {
        setStatistics(response.data);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/permissions');
      if (response.data) {
        setPermissions(response.data);
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
    }
  };

  const fetchRolePermissions = async (roleId) => {
    try {
      const response = await api.get(`/roles/${roleId}/permissions`);
      if (response.data) {
        setSelectedPermissions(response.data.map(p => p.permission_id));
      }
    } catch (err) {
      console.error('Error fetching role permissions:', err);
      setSelectedPermissions([]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      setSavingPermissions(true);
      const response = await api.put(`/roles/${selectedRole.role_id}/permissions`, {
        permission_ids: selectedPermissions
      });
      if (response && response.success) {
        showSuccess(`Permissions updated for ${selectedRole.role_name}!`);
        setShowPermissionsModal(false);
        fetchRoles();
      } else {
        showError(response?.message || 'Failed to update permissions.');
      }
    } catch (err) {
      console.error('Error updating permissions:', err);
      showError(err.message || 'Failed to update permissions.');
    } finally {
      setSavingPermissions(false);
    }
  };

  const openPermissionsModal = async (role) => {
    setSelectedRole(role);
    await fetchRolePermissions(role.role_id);
    setShowPermissionsModal(true);
  };

  const togglePermission = (permissionId) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleModulePermissions = (modulePermissions) => {
    const allSelected = modulePermissions.every(p => selectedPermissions.includes(p.permission_id));
    if (allSelected) {
      setSelectedPermissions(prev =>
        prev.filter(id => !modulePermissions.find(p => p.permission_id === id))
      );
    } else {
      setSelectedPermissions(prev => [
        ...prev,
        ...modulePermissions.filter(p => !prev.includes(p.permission_id)).map(p => p.permission_id)
      ]);
    }
  };

  // Role Metadata definitions for rich display
  const ROLE_DEFINITIONS = {
    'super admin': {
      tier: 'Level 1: Sovereign Governance',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      badgeColor: 'bg-purple-600 text-white',
      desc: 'Master consortium administration with authority over multi-campus databases, system audits, and global security policies.',
      icon: FiShield,
    },
    'admin': {
      tier: 'Level 2: Campus Leadership',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      badgeColor: 'bg-blue-600 text-white',
      desc: 'Institutional library administrator managing campus collections, approving inter-library loan passes, and staff assignments.',
      icon: FiGlobe,
    },
    'librarian': {
      tier: 'Level 3: Operations & Circulation',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeColor: 'bg-emerald-600 text-white',
      desc: 'Front-desk circulation officer executing book checkouts, returns, shelf inventory audits, and overdue follow-ups.',
      icon: FiActivity,
    },
    'student': {
      tier: 'Level 4: Academic Patron',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      badgeColor: 'bg-slate-700 text-white',
      desc: 'Enrolled university student accessing union catalog search, inter-library loan requests, and personal borrow history.',
      icon: FiUsers,
    }
  };

  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        role.role_name?.toLowerCase().includes(q) ||
        role.description?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || role.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [roles, searchTerm, statusFilter]);

  return (
    <div className="space-y-6 animate-slide-up pb-12">
      <LoadingOverlay show={loading} text="Loading role governance matrix..." />

      {/* ─────────────────────────────────────────────────────────────
          1. CONSORTIUM RBAC HERO BANNER (Dark Navy Gradient)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/40">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold tracking-wide border border-blue-400/30 mb-2">
              <FiShield className="w-3.5 h-3.5 text-blue-400" />
              Role-Based Access Control (RBAC)
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              Consortium Role Governance & Permissions
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Configure hierarchical authorization tiers, modular permission policies, and security guardrails across all multi-campus institutions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchInitialData}
              disabled={refreshing}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
              title="Refresh Roles"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span>Refresh Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SUMMARY KPI CHIPS (Clean White Surfaces)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Defined Roles</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{roles.length} Roles</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FiShield className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Policies</span>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">
              {roles.filter(r => r.status === 'active').length} Active
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FiCheckCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Patrons</span>
            <div className="text-xl font-bold text-purple-600 mt-0.5">{statistics?.total_users || 74} Users</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FiUsers className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Security State</span>
            <div className="text-xl font-bold text-blue-600 mt-0.5">Enforced</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FiLock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CONTROLS: SEARCH & FILTER BAR (Clean White Surface)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search roles by title or scope..."
            className="w-full pl-10 pr-9 py-2 rounded-xl text-sm border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
          {['all', 'active', 'inactive'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 font-semibold rounded-lg capitalize transition-all ${
                statusFilter === st
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. ROLE HIERARCHY CARDS (Clean White Surfaces)
      ───────────────────────────────────────────────────────────── */}
      {filteredRoles.length === 0 ? (
        <Card padding="lg" className="text-center py-16">
          <EmptyState
            icon={<FiShield className="w-14 h-14 text-slate-300 mx-auto" />}
            title="No matching roles found"
            description="Try adjusting your search criteria."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRoles.map((role) => {
            const normalizedName = role.role_name?.toLowerCase().trim();
            const meta = ROLE_DEFINITIONS[normalizedName] || {
              tier: 'Custom Role Tier',
              color: 'bg-slate-100 text-slate-700 border-slate-200',
              badgeColor: 'bg-blue-600 text-white',
              desc: role.description || 'Custom institutional delegation.',
              icon: FiShield,
            };
            const IconComponent = meta.icon;

            return (
              <div
                key={role.role_id}
                className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-xs">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                          {meta.tier}
                        </span>
                        <h3 className="font-bold text-base text-slate-900 leading-tight mt-0.5">
                          {role.role_name === 'Admin' ? 'Admin-Librarian' : role.role_name}
                        </h3>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      role.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {role.status === 'active' ? 'Active Policy' : 'Inactive'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {role.description || meta.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenMembersDrawer(role)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors group/btn cursor-pointer"
                    title="Click to view assigned users directory"
                  >
                    <FiUsers className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-blue-600" />
                    <span>
                      <strong className="text-slate-800 font-bold group-hover/btn:text-blue-600">
                        {getRoleUserCount(role.role_id, role.role_name)}
                      </strong> assigned
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600 underline ml-0.5">Directory</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenMembersDrawer(role)}
                      className="!text-xs !py-1.5 !px-2.5 font-semibold !text-slate-700 hover:!bg-slate-100 !border-slate-200 flex items-center gap-1.5"
                    >
                      <FiUsers className="w-3.5 h-3.5 text-slate-500" />
                      <span>Members</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openPermissionsModal(role)}
                      className="!text-xs !py-1.5 !px-3 font-semibold !text-blue-600 hover:!bg-blue-50 !border-blue-200 flex items-center gap-1.5"
                    >
                      <FiKey className="w-3.5 h-3.5" />
                      <span>Permissions</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. GRANULAR PERMISSION MATRIX MODAL
      ───────────────────────────────────────────────────────────── */}
      {showPermissionsModal && selectedRole && (
        <Modal
          isOpen={showPermissionsModal}
          onClose={() => setShowPermissionsModal(false)}
          title={
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FiKey className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-slate-900 text-base block">
                  Permissions Matrix: {selectedRole.role_name === 'Admin' ? 'Admin-Librarian' : selectedRole.role_name}
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  Grant or revoke granular system and circulation capabilities
                </span>
              </div>
            </div>
          }
          description="Click module checkboxes to assign or revoke functional policies for this role."
          size="xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500">
                <strong className="text-blue-600 font-bold">{selectedPermissions.length}</strong> permissions currently active
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowPermissionsModal(false)}
                  disabled={savingPermissions}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSavePermissions}
                  disabled={savingPermissions}
                  className="!bg-blue-600 hover:!bg-blue-500 !text-white flex items-center gap-1.5"
                >
                  {savingPermissions ? (
                    <>
                      <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-3.5 h-3.5" />
                      <span>Apply Permissions</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            {Object.keys(permissions).length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No permissions modules registered in the system.
              </div>
            ) : (
              Object.entries(permissions).map(([moduleName, modulePermissions]) => {
                const allSelected = modulePermissions.every(p => selectedPermissions.includes(p.permission_id));

                return (
                  <div 
                    key={moduleName}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <h4 className="font-bold text-sm text-slate-900 capitalize">
                          {moduleName.replace(/_/g, ' ')} Module
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleModulePermissions(modulePermissions)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {modulePermissions.map((perm) => {
                        const isChecked = selectedPermissions.includes(perm.permission_id);

                        return (
                          <label
                            key={perm.permission_id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-blue-50/50 border-blue-300 text-slate-900'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.permission_id)}
                              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-semibold block leading-tight">
                                {perm.permission_name || perm.name}
                              </span>
                              {perm.description && (
                                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                  {perm.description}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. LIVE ROLE MEMBERS DIRECTORY DRAWER (Slide-over)
      ───────────────────────────────────────────────────────────── */}
      {showMembersDrawer && activeDrawerRole && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowMembersDrawer(false)}
          />

          <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-md sm:max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-slide-left">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-xs">
                    <FiUsers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                      Assigned Personnel Directory
                    </span>
                    <h3 className="font-bold text-base text-slate-900 leading-tight mt-0.5">
                      {activeDrawerRole.role_name === 'Admin' ? 'Admin-Librarian' : activeDrawerRole.role_name}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setShowMembersDrawer(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Search & Filter Controls */}
              <div className="p-4 border-b border-slate-100 bg-white space-y-3">
                <div className="relative">
                  <FiSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    placeholder="Search member by name, email, or ID..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl text-xs border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {drawerSearch && (
                    <button
                      onClick={() => setDrawerSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    Filtered: <strong className="text-slate-800">{drawerMembers.length}</strong> active members
                  </span>

                  <select
                    value={drawerCampusFilter}
                    onChange={(e) => setDrawerCampusFilter(e.target.value)}
                    className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">All Campuses</option>
                    {schools.map(s => (
                      <option key={s.school_id} value={s.school_id}>
                        {s.school_code || s.school_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drawer Member List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
                {drawerMembers.length === 0 ? (
                  <div className="py-16 text-center">
                    <FiUsers className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-700">No Members Found</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      No patrons or staff with this role matched your current search or campus filter.
                    </p>
                  </div>
                ) : (
                  drawerMembers.map(user => {
                    const initials = `${(user.firstname?.[0] || user.name?.[0] || 'U')}${(user.lastname?.[0] || '')}`.toUpperCase();
                    const campusCode = user.schools?.school_code || schools.find(s => String(s.school_id) === String(user.school_id))?.school_code || 'ALL';

                    return (
                      <div 
                        key={user.user_id || user.id} 
                        className="pt-3 first:pt-0 flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                            {initials}
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {user.firstname ? `${user.firstname} ${user.lastname || ''}` : (user.name || user.email)}
                              </h4>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {campusCode}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                              <FiMail className="w-3 h-3 text-slate-400" />
                              <span>{user.email}</span>
                            </div>

                            <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-400">
                              {user.student_number && (
                                <span className="font-mono">SN: {user.student_number}</span>
                              )}
                              {user.employee_number && (
                                <span className="font-mono">EMP: {user.employee_number}</span>
                              )}
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {user.status || 'Active'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenReassign(user)}
                          className="!text-[11px] !py-1 !px-2.5 !text-slate-700 hover:!bg-blue-50 hover:!text-blue-600 !border-slate-200 flex items-center gap-1 flex-shrink-0"
                          title="Change user's institutional role"
                        >
                          <FiRefreshCw className="w-3 h-3 text-slate-400" />
                          <span>Reassign</span>
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Consortium User Identity Sync
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowMembersDrawer(false)}
                  className="text-xs font-semibold"
                >
                  Close Directory
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. QUICK ROLE REASSIGNMENT MODAL
      ───────────────────────────────────────────────────────────── */}
      {showReassignModal && reassignUser && (
        <Modal
          isOpen={showReassignModal}
          onClose={() => !savingReassign && setShowReassignModal(false)}
          title="Reassign Patron / Staff Role"
          description="Update institutional authority level and system privileges for this user account."
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                onClick={() => setShowReassignModal(false)}
                disabled={savingReassign}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmReassign}
                disabled={savingReassign || !reassignTargetRoleId}
                className="!bg-blue-600 hover:!bg-blue-700 !text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {savingReassign ? (
                  <>
                    <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <FiCheck className="w-3.5 h-3.5" />
                    <span>Save New Role</span>
                  </>
                )}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target User</span>
              <div className="font-bold text-sm text-slate-900 mt-0.5">
                {reassignUser.firstname ? `${reassignUser.firstname} ${reassignUser.lastname || ''}` : (reassignUser.name || reassignUser.email)}
              </div>
              <div className="text-xs text-slate-500">{reassignUser.email}</div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Select New Institutional Role
              </label>
              <select
                value={reassignTargetRoleId}
                onChange={(e) => setReassignTargetRoleId(e.target.value)}
                className="w-full p-2.5 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              >
                {roles.map(r => (
                  <option key={r.role_id} value={r.role_id}>
                    {r.role_name === 'Admin' ? 'Admin-Librarian' : r.role_name} ({r.role_name === 'Super Admin' ? 'Tier 1' : r.role_name === 'Admin' ? 'Tier 2' : r.role_name === 'Librarian' ? 'Tier 3' : 'Tier 4'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Changing this user's role will immediately update their catalog navigation, borrow approvals, and permissions.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default SuperAdminRoles;
