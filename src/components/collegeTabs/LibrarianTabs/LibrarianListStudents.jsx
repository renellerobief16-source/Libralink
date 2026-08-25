import { useState, useEffect } from "react";
import { FiUsers, FiEdit, FiSearch } from "react-icons/fi";
import api from "../../../utils/api";
import Card from "../../ui/Card";
import StatusBadge from "../../ui/StatusBadge";
import EmptyState from "../../ui/EmptyState";
import Input from "../../ui/Input";

function AdminListStudents() {
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    firstname: '',
    lastname: '',
    student_number: '',
    gender: '',
    contact_number: '',
    email: ''
  });

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

  const filteredStudents = students.filter(student =>
    student.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchStudents = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      console.error('No schoolId found in localStorage');
      return;
    }

    setStudentsLoading(true);
    try {
      const response = await api.get(`/users/school/${schoolId}`);
      setStudents(response.data || []);
      
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

  return (
    <div className="animate-slide-up">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1">Students</h2>
            <p className="text-[#64748B] text-sm">View and manage all registered students</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiUsers className="w-5 h-5 text-[#2563EB]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">{students.length}</p>
              <p className="text-xs text-[#64748B]">Total Students</p>
            </div>
          </div>
        </div>
      </div>
      
      {studentsLoading ? (
        <Card>
          <p className="text-sm text-[#64748B]">Loading students...</p>
        </Card>
      ) : (
        <>
          {/* Search Bar */}
          <Card className="mb-6">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
              <Input
                type="text"
                placeholder="Search students by name or student number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          {/* Edit Modal */}
          {editingStudent && (
            <Card className="mb-6 border-2 border-[#2563EB]">
              <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Edit Student</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </Card>
          )}

          <Card>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4">{schoolName} Students ({filteredStudents.length})</h3>
            {filteredStudents.length === 0 ? (
              <EmptyState
                icon={<FiUsers />}
                title="No Students Found"
                description="No students match your search criteria."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="text-[#64748B] text-left text-sm border-b border-[#E2E8F0]">
                      <th className="p-3">Name</th>
                      <th className="p-3">Student Number</th>
                      <th className="p-3">Gender</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.user_id} className="border-t border-[#E2E8F0]">
                        <td className="p-3 text-[#0F172A]">
                          {student.firstname} {student.lastname}
                        </td>
                        <td className="p-3 text-[#64748B]">
                          {student.student_number || 'N/A'}
                        </td>
                        <td className="p-3 text-[#64748B]">
                          {student.gender || 'N/A'}
                        </td>
                        <td className="p-3 text-[#64748B]">
                          {student.email || 'N/A'}
                        </td>
                        <td className="p-3 text-[#64748B]">
                          {student.contact_number || 'N/A'}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={student.status || 'inactive'} />
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleEditClick(student)}
                            className="p-2 text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Student"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default AdminListStudents;
