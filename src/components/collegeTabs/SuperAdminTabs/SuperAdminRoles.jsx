import { useState, useEffect } from "react";
import { FiShield, FiUsers, FiCheckCircle, FiXCircle, FiSearch, FiFilter, FiPlus, FiEdit, FiEye, FiTrash2, FiSettings, FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
import api from "../../../utils/api";
import { PageHeader, Button, Card, Input, Select, Modal, StatusBadge, EmptyState, DataTable, SearchBar, IconButton } from '../../ui';

function SuperAdminRoles({ darkMode }) {
  const [roles, setRoles] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("role_name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Selected role
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    role_name: "",
    description: "",
    status: "active"
  });

  // Error/success states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchRoles();
    fetchStatistics();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await api.get("/roles");
      if (response.data) {
        setRoles(response.data);
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
      setError("Failed to fetch roles");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get("/roles/statistics");
      if (response.data) {
        setStatistics(response.data);
      }
    } catch (err) {
      console.error("Error fetching statistics:", err);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await api.get("/permissions");
      if (response.data) {
        setPermissions(response.data);
      }
    } catch (err) {
      console.error("Error fetching permissions:", err);
    }
  };

  const fetchRolePermissions = async (roleId) => {
    try {
      const response = await api.get(`/roles/${roleId}/permissions`);
      if (response.data) {
        setSelectedPermissions(response.data.map(p => p.permission_id));
      }
    } catch (err) {
      console.error("Error fetching role permissions:", err);
    }
  };

  // Filter and sort roles
  const filteredRoles = roles
    .filter(role => {
      const matchesSearch = role.role_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || role.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "role_name") {
        comparison = a.role_name.localeCompare(b.role_name);
      } else if (sortBy === "created_at") {
        comparison = new Date(a.created_at) - new Date(b.created_at);
      } else if (sortBy === "user_count") {
        comparison = a.user_count - b.user_count;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Pagination
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const paginatedRoles = filteredRoles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAddRole = async () => {
    try {
      setError("");
      if (!formData.role_name.trim()) {
        setError("Role name is required");
        return;
      }

      const response = await api.post("/roles", formData);
      if (response.success) {
        setSuccess("Role created successfully");
        setShowAddModal(false);
        setFormData({ role_name: "", description: "", status: "active" });
        fetchRoles();
        fetchStatistics();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Error creating role:", err);
      setError(err.message || "Failed to create role");
    }
  };

  const handleEditRole = async () => {
    try {
      setError("");
      if (!formData.role_name.trim()) {
        setError("Role name is required");
        return;
      }

      const response = await api.put(`/roles/${selectedRole.role_id}`, formData);
      if (response.success) {
        setSuccess("Role updated successfully");
        setShowEditModal(false);
        setSelectedRole(null);
        setFormData({ role_name: "", description: "", status: "active" });
        fetchRoles();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Error updating role:", err);
      setError(err.message || "Failed to update role");
    }
  };

  const handleDeleteRole = async () => {
    try {
      setError("");
      const response = await api.delete(`/roles/${selectedRole.role_id}`);
      if (response.success) {
        setSuccess("Role deleted successfully");
        setShowDeleteModal(false);
        setSelectedRole(null);
        fetchRoles();
        fetchStatistics();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Error deleting role:", err);
      setError(err.message || "Failed to delete role");
    }
  };

  const handleSavePermissions = async () => {
    try {
      setError("");
      const response = await api.put(`/roles/${selectedRole.role_id}/permissions`, {
        permission_ids: selectedPermissions
      });
      if (response.success) {
        setSuccess("Permissions updated successfully");
        setShowPermissionsModal(false);
        setSelectedRole(null);
        setSelectedPermissions([]);
        fetchRoles();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Error updating permissions:", err);
      setError(err.message || "Failed to update permissions");
    }
  };

  const openEditModal = (role) => {
    setSelectedRole(role);
    setFormData({
      role_name: role.role_name,
      description: role.description || "",
      status: role.status
    });
    setShowEditModal(true);
  };

  const openPermissionsModal = (role) => {
    setSelectedRole(role);
    fetchRolePermissions(role.role_id);
    setShowPermissionsModal(true);
  };

  const openDetailsDrawer = (role) => {
    setSelectedRole(role);
    setShowDetailsDrawer(true);
  };

  const openDeleteModal = (role) => {
    setSelectedRole(role);
    setShowDeleteModal(true);
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

  return (
    <div className="animate-slide-up">
      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-4 rounded-xl bg-green-50 text-green-700 border border-green-200">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <PageHeader
        title="Roles Management"
        description="Manage system roles and permissions"
        actions={[
          { label: 'Add Role', onClick: () => setShowAddModal(true), variant: 'primary' }
        ]}
      />

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <StatCard icon={FiShield} title="Total Roles" value={statistics.total_roles} />
          <StatCard icon={FiCheckCircle} title="Active Roles" value={statistics.active_roles} />
          <StatCard icon={FiXCircle} title="Inactive Roles" value={statistics.inactive_roles} />
          <StatCard icon={FiUsers} title="Total Users" value={statistics.total_users} />
        </div>
      )}

      {/* Search and Filter Bar */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full lg:w-auto">
            <SearchBar
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
            />
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'role_name', label: 'Sort by Name' },
                { value: 'created_at', label: 'Sort by Date' },
                { value: 'user_count', label: 'Sort by Users' },
              ]}
            />
            <IconButton
              icon={sortOrder === "asc" ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              variant="ghost"
            />
          </div>
        </div>
      </Card>

      {/* Roles Table */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading roles...</p>
        </div>
      ) : paginatedRoles.length === 0 ? (
        <EmptyState
          icon={<FiShield className="w-16 h-16" />}
          title="No roles found"
          description={searchTerm || statusFilter !== "all" ? "Try adjusting your search or filters" : "Get started by adding your first role"}
          action={searchTerm || statusFilter !== "all" ? undefined : { label: 'Add Role', onClick: () => setShowAddModal(true) }}
        />
      ) : (
        <>
          <DataTable
            columns={[
              { header: 'Role Name', accessor: 'role_name', cell: (row) => <span className="font-medium text-slate-900">{row.role_name}</span> },
              { header: 'Description', accessor: 'description', cell: (row) => <span className="text-slate-600">{row.description || "-"}</span> },
              { header: 'Assigned Users', accessor: 'user_count', cell: (row) => <span className="text-slate-600">{row.user_count || 0}</span> },
              { header: 'Permissions', accessor: 'permission_count', cell: (row) => <span className="text-slate-600">{row.permission_count || 0}</span> },
              { header: 'Status', accessor: 'status', cell: (row) => <StatusBadge status={row.status} variant={row.status === 'active' ? 'success' : 'error'} /> },
              { header: 'Created Date', accessor: 'created_at', cell: (row) => <span className="text-slate-600">{new Date(row.created_at).toLocaleDateString()}</span> },
              { header: 'Actions', cell: (row) => (
                <div className="flex items-center gap-2">
                  <IconButton icon={<FiEye className="w-4 h-4" />} onClick={() => openDetailsDrawer(row)} variant="ghost" title="View Details" />
                  <IconButton icon={<FiEdit className="w-4 h-4" />} onClick={() => openEditModal(row)} variant="ghost" title="Edit Role" />
                  <IconButton icon={<FiSettings className="w-4 h-4" />} onClick={() => openPermissionsModal(row)} variant="ghost" title="Manage Permissions" />
                  <IconButton icon={<FiTrash2 className="w-4 h-4" />} onClick={() => openDeleteModal(row)} variant="ghost" title="Delete Role" className="text-red-500 hover:text-red-600" />
                </div>
              )},
            ]}
            data={paginatedRoles}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRoles.length)} of {filteredRoles.length} roles
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  variant="ghost"
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    variant={currentPage === page ? 'primary' : 'ghost'}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  variant="ghost"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Role Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormData({ role_name: "", description: "", status: "active" });
          setError("");
        }}
        title="Add New Role"
        description="Create a new system role"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowAddModal(false);
              setFormData({ role_name: "", description: "", status: "active" });
              setError("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddRole}>Save Role</Button>
          </>
        }
      >
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <Input
          label="Role Name *"
          placeholder="Enter role name"
          value={formData.role_name}
          onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
        />
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-slate-700">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter role description"
            rows={3}
          />
        </div>
        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedRole(null);
          setFormData({ role_name: "", description: "", status: "active" });
          setError("");
        }}
        title="Edit Role"
        description="Update role information"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowEditModal(false);
              setSelectedRole(null);
              setFormData({ role_name: "", description: "", status: "active" });
              setError("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditRole}>Update Role</Button>
          </>
        }
      >
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <Input
          label="Role Name *"
          placeholder="Enter role name"
          value={formData.role_name}
          onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
        />
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-slate-700">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter role description"
            rows={3}
          />
        </div>
        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </Modal>

      {/* Permission Management Modal */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          setSelectedRole(null);
          setSelectedPermissions([]);
          setError("");
        }}
        title={`Manage Permissions - ${selectedRole?.role_name}`}
        description="Configure role permissions"
        size="full"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowPermissionsModal(false);
              setSelectedRole(null);
              setSelectedPermissions([]);
              setError("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions}>Save Permissions</Button>
          </>
        }
      >
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="max-h-[60vh] overflow-y-auto">
          {Object.entries(permissions).map(([module, modulePermissions]) => (
            <Card key={module} padding="md" className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold capitalize text-slate-900">{module}</h3>
                <button
                  onClick={() => toggleModulePermissions(modulePermissions)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Select All
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.isArray(modulePermissions) && modulePermissions.map((permission) => (
                  <label key={permission.permission_id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.permission_id)}
                      onChange={() => togglePermission(permission.permission_id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">
                      {permission.action}
                    </span>
                  </label>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Modal>

      {/* Role Details Drawer */}
      {showDetailsDrawer && selectedRole && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetailsDrawer(false)} />
          <div className="relative w-full max-w-md h-full overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Role Details</h2>
              <IconButton
                icon={<FiX className="w-5 h-5" />}
                onClick={() => setShowDetailsDrawer(false)}
                variant="ghost"
              />
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-500">Role Name</label>
                <p className="text-lg font-semibold text-slate-900">{selectedRole.role_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Description</label>
                <p className="text-slate-700">{selectedRole.description || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Status</label>
                <p>
                  <StatusBadge status={selectedRole.status} variant={selectedRole.status === 'active' ? 'success' : 'error'} />
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Created Date</label>
                <p className="text-slate-700">
                  {new Date(selectedRole.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Last Updated</label>
                <p className="text-slate-700">
                  {selectedRole.updated_at ? new Date(selectedRole.updated_at).toLocaleDateString() : "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Assigned Users</label>
                <p className="text-lg font-semibold text-slate-900">{selectedRole.user_count || 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Total Permissions</label>
                <p className="text-lg font-semibold text-slate-900">{selectedRole.permission_count || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedRole(null);
          setError("");
        }}
        title="Delete Role"
        description={`Are you sure you want to delete the role "${selectedRole?.role_name}"? This action cannot be undone.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowDeleteModal(false);
              setSelectedRole(null);
              setError("");
            }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteRole}>Delete Role</Button>
          </>
        }
      >
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      </Modal>
    </div>
  );
}

function StatCard({ icon: Icon, title, value }) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
      <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
      <p className="text-sm font-medium text-slate-600">{title}</p>
    </Card>
  );
}

export default SuperAdminRoles;
