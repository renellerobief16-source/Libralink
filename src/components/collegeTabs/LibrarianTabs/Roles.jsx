import { useState, useEffect } from "react";
import { FiShield, FiUsers, FiCheckCircle, FiXCircle, FiSearch, FiFilter, FiPlus, FiEdit, FiEye, FiTrash2, FiSettings, FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
import api from "../../../utils/api";

function Roles({ darkMode }) {
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
        <div className="mb-4 p-4 rounded-xl bg-green-100 text-green-700 border border-green-200">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-100 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <StatCard icon={FiShield} title="Total Roles" value={statistics.total_roles} color="purple" darkMode={darkMode} />
          <StatCard icon={FiCheckCircle} title="Active Roles" value={statistics.active_roles} color="green" darkMode={darkMode} />
          <StatCard icon={FiXCircle} title="Inactive Roles" value={statistics.inactive_roles} color="red" darkMode={darkMode} />
          <StatCard icon={FiUsers} title="Total Users" value={statistics.total_users} color="blue" darkMode={darkMode} />
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className={`rounded-2xl p-6 shadow-sm border mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full lg:w-auto">
            <div className="relative">
              <FiSearch className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
            </div>
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`px-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
            >
              <option value="role_name">Sort by Name</option>
              <option value="created_at">Sort by Date</option>
              <option value="user_count">Sort by Users</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className={`p-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'} hover:bg-gray-100`}
            >
              {sortOrder === "asc" ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              <FiPlus className="w-5 h-5" />
              <span>Add Role</span>
            </button>
          </div>
        </div>
      </div>

      {/* Roles Table */}
      <div className={`rounded-2xl shadow-sm border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading roles...</p>
          </div>
        ) : paginatedRoles.length === 0 ? (
          <div className="p-8 text-center">
            <FiShield className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>No roles found</p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {searchTerm || statusFilter !== "all" ? "Try adjusting your search or filters" : "Get started by adding your first role"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className={`text-left px-6 py-4 text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Role Name</th>
                    <th className={`text-left px-6 py-4 text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Description</th>
                    <th className={`text-left px-6 py-4 text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Assigned Users</th>
                    <th className={`text-left px-6 py-4 text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Permissions</th>
                    <th className={`text-left px-6 py-4 text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                    <th className={`text-left px-6 py-4 text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Created Date</th>
                    <th className={`text-left px-6 py-4 text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRoles.map((role) => (
                    <tr key={role.role_id} className={`border-b last:border-b-0 ${darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <td className={`px-6 py-4 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{role.role_name}</td>
                      <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{role.description || "-"}</td>
                      <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{role.user_count || 0}</td>
                      <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{role.permission_count || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          role.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {role.status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {new Date(role.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetailsDrawer(role)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            title="View Details"
                          >
                            <FiEye className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                          </button>
                          <button
                            onClick={() => openEditModal(role)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            title="Edit Role"
                          >
                            <FiEdit className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                          </button>
                          <button
                            onClick={() => openPermissionsModal(role)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            title="Manage Permissions"
                          >
                            <FiSettings className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(role)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete Role"
                          >
                            <FiTrash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRoles.length)} of {filteredRoles.length} roles
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-lg ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-lg ${currentPage === page ? 'bg-purple-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-lg ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Role Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-xl w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add New Role</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <FiX className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Role Name *</label>
                <input
                  type="text"
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  placeholder="Enter role name"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  placeholder="Enter role description"
                  rows={3}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t dark:border-gray-700">
              <button
                onClick={() => setShowAddModal(false)}
                className={`flex-1 px-4 py-2 rounded-xl border ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                className="flex-1 px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-xl w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Edit Role</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <FiX className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Role Name *</label>
                <input
                  type="text"
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  placeholder="Enter role name"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  placeholder="Enter role description"
                  rows={3}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className={`w-full px-4 py-2 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t dark:border-gray-700">
              <button
                onClick={() => setShowEditModal(false)}
                className={`flex-1 px-4 py-2 rounded-xl border ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleEditRole}
                className="flex-1 px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Management Modal */}
      {showPermissionsModal && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Manage Permissions - {selectedRole.role_name}
              </h2>
              <button onClick={() => setShowPermissionsModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <FiX className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              {Object.entries(permissions).map(([module, modulePermissions]) => (
                <div key={module} className={`mb-6 p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold capitalize ${darkMode ? 'text-white' : 'text-gray-900'}`}>{module}</h3>
                    <button
                      onClick={() => toggleModulePermissions(modulePermissions)}
                      className="text-sm text-purple-600 hover:text-purple-700"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {modulePermissions.map((permission) => (
                      <label key={permission.permission_id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.permission_id)}
                          onChange={() => togglePermission(permission.permission_id)}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {permission.action}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 p-6 border-t dark:border-gray-700">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className={`flex-1 px-4 py-2 rounded-xl border ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                className="flex-1 px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Details Drawer */}
      {showDetailsDrawer && selectedRole && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetailsDrawer(false)} />
          <div className={`relative w-full max-w-md h-full overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Role Details</h2>
              <button onClick={() => setShowDetailsDrawer(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <FiX className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Role Name</label>
                <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedRole.role_name}</p>
              </div>
              <div>
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Description</label>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{selectedRole.description || "-"}</p>
              </div>
              <div>
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</label>
                <p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedRole.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedRole.status}
                  </span>
                </p>
              </div>
              <div>
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Created Date</label>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                  {new Date(selectedRole.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Last Updated</label>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                  {selectedRole.updated_at ? new Date(selectedRole.updated_at).toLocaleDateString() : "-"}
                </p>
              </div>
              <div>
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Assigned Users</label>
                <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedRole.user_count || 0}</p>
              </div>
              <div>
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Permissions</label>
                <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedRole.permission_count || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-xl w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <FiTrash2 className="w-6 h-6 text-red-600" />
                </div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Delete Role</h2>
              </div>
              <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Are you sure you want to delete the role "{selectedRole.role_name}"? This action cannot be undone.
              </p>
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className={`flex-1 px-4 py-2 rounded-xl border ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRole}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Delete Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, title, value, color, darkMode }) {
  const colorClasses = {
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600',
  };

  return (
    <div className={`rounded-2xl p-6 shadow-sm border transition-all hover:shadow-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${colorClasses[color]}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</h3>
      <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
    </div>
  );
}

export default Roles;
