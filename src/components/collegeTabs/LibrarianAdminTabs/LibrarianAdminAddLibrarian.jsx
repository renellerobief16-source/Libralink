import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiFilter, FiUsers, FiUser } from 'react-icons/fi';
import api from '../../../utils/api';
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";

function LibrarianAdminAddLibrarian() {
  const [activeTab, setActiveTab] = useState('students'); // 'students' or 'librarians'
  const [students, setStudents] = useState([]);
  const [librarians, setLibrarians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null);
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
  });
  const [searchQuery, setSearchQuery] = useState('');

  const schoolId = localStorage.getItem('schoolId');

  useEffect(() => {
    fetchStudents();
    fetchLibrarians();
    fetchSchoolInfo();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get(`/users/school/${schoolId}?role_id=4`);
      setStudents(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      setLoading(false);
    }
  };

  const fetchLibrarians = async () => {
    try {
      const response = await api.get(`/users/school/${schoolId}?role_id=3`);
      setLibrarians(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching librarians:', error);
      setLoading(false);
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

  const handleAddUser = async () => {
    try {
      // Validation
      if (!formData.firstname || !formData.lastname || !formData.email || !formData.password) {
        alert('Please fill in all required fields (First Name, Last Name, Email, Password)');
        return;
      }

      console.log('Adding user - schoolId from localStorage:', schoolId);

      const data = {
        ...formData,
        role_id: activeTab === 'students' ? 4 : 3, // 4 for students, 3 for librarians
        school_id: schoolId,
      };
      
      console.log('Sending data:', data);
      
      const response = await api.post('/users', data);
      
      if (response.success) {
        if (activeTab === 'students') {
          await fetchStudents();
        } else {
          await fetchLibrarians();
        }
        setShowAddModal(false);
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
        });
        alert('User added successfully!');
      } else {
        alert('Failed to add user: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Error adding user: ' + (error.message || 'Please try again'));
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      password: '',
      employee_number: user.employee_number || '',
      contact_number: user.contact_number || '',
      gender: user.gender || '',
      position: user.position || '',
    });
    setShowAddModal(true);
  };

  const handleUpdateUser = async () => {
    try {
      const data = {
        ...formData,
        school_id: schoolId,
      };
      await api.put(`/users/${editingUser.user_id}`, data);
      if (activeTab === 'students') {
        await fetchStudents();
      } else {
        await fetchLibrarians();
      }
      setShowAddModal(false);
      setEditingUser(null);
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
      });
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (id) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/users/${id}`);
        if (activeTab === 'students') {
          await fetchStudents();
        } else {
          await fetchLibrarians();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const getCurrentUsers = () => {
    return activeTab === 'students' ? students : librarians;
  };

  const filteredUsers = getCurrentUsers().filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return !searchQuery ||
      user.firstname?.toLowerCase().includes(searchLower) ||
      user.lastname?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-1">Users Management</h2>
            <p className="text-[#64748B] text-sm">Manage students and librarians for your school</p>
          </div>
          <button
            onClick={() => {
              console.log('Add User button clicked');
              console.log('schoolId:', schoolId);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
          >
            <FiPlus className="w-4 h-4" />
            <span className="text-sm">Add {activeTab === 'students' ? 'Student' : 'Librarian'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Card className="mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
              activeTab === 'students'
                ? 'bg-[#2563EB] text-white font-medium'
                : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
            }`}
          >
            <FiUsers className="w-4 h-4" />
            <span>Students</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'students' ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {students.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('librarians')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
              activeTab === 'librarians'
                ? 'bg-[#2563EB] text-white font-medium'
                : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
            }`}
          >
            <FiUser className="w-4 h-4" />
            <span>Librarians</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'librarians' ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {librarians.length}
            </span>
          </button>
        </div>
      </Card>

      {/* Search */}
      <Card className="mb-6">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#64748B]" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[#64748B] text-left text-sm border-b border-[#E2E8F0]">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                {activeTab === 'students' ? (
                  <th className="p-3">Student Number</th>
                ) : (
                  <th className="p-3">Position</th>
                )}
                {schoolInfo && <th className="p-3">School</th>}
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.user_id} className="border-t border-[#E2E8F0]">
                  <td className="p-3 text-[#0F172A]">
                    {user.firstname} {user.lastname}
                  </td>
                  <td className="p-3 text-[#64748B]">
                    {user.email}
                  </td>
                  {activeTab === 'students' ? (
                    <td className="p-3 text-[#64748B]">
                      {user.student_number || 'N/A'}
                    </td>
                  ) : (
                    <td className="p-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {user.position || 'Librarian'}
                      </span>
                    </td>
                  )}
                  {schoolInfo && (
                    <td className="p-3 text-[#64748B]">
                      {schoolInfo.school_name}
                    </td>
                  )}
                  <td className="p-3">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      Active
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        title="Edit User"
                      >
                        <FiEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.user_id)}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        title="Delete User"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredUsers.length === 0 && !loading && (
        <Card>
          <div className="rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiFilter className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-[#0F172A]">No {activeTab === 'students' ? 'students' : 'librarians'} found</h3>
            <p className="text-sm text-[#64748B]">Add your first {activeTab === 'students' ? 'student' : 'librarian'} to get started</p>
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">
                {editingUser ? 'Edit User' : `Add New ${activeTab === 'students' ? 'Student' : 'Librarian'}`}
              </h3>
              <p className="text-green-100 text-sm mt-1">
                {editingUser ? 'Update user information' : `Fill in the ${activeTab === 'students' ? 'student' : 'librarian'} details below`}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">First Name *</label>
                  <Input
                    type="text"
                    placeholder="First name"
                    value={formData.firstname}
                    onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Last Name *</label>
                  <Input
                    type="text"
                    placeholder="Last name"
                    value={formData.lastname}
                    onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Email *</label>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Password {editingUser ? '(leave blank to keep current)' : '*'}</label>
                  <Input
                    type="password"
                    placeholder={editingUser ? 'New password (optional)' : 'Enter password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                {activeTab === 'students' ? (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#64748B]">Student Number</label>
                    <Input
                      type="text"
                      placeholder="Student number"
                      value={formData.student_number}
                      onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#64748B]">Employee Number</label>
                    <Input
                      type="text"
                      placeholder="Employee number"
                      value={formData.employee_number}
                      onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Contact Number</label>
                  <Input
                    type="text"
                    placeholder="Phone number"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-[#64748B]">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-white text-[#0F172A]"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {activeTab === 'librarians' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2 text-[#64748B]">Position</label>
                    <Input
                      type="text"
                      placeholder="Position (e.g., Librarian, Assistant Librarian, Library Technician)"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
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
                  });
                }}
                className="px-6 py-2.5 rounded-xl border-2 border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={editingUser ? handleUpdateUser : handleAddUser}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 text-white hover:shadow-lg transition-all font-medium"
              >
                {editingUser ? 'Update User' : `Add ${activeTab === 'students' ? 'Student' : 'Librarian'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarianAdminAddLibrarian;
