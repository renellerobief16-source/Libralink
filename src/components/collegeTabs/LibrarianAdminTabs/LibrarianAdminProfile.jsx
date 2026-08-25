import { useState, useEffect } from "react";
import { FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiEdit2, FiSave, FiX } from "react-icons/fi";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import api from "../../../utils/api";

function LibrarianAdminProfile() {
  const [user, setUser] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    contact_number: '',
    position: '',
    employee_number: '',
  });
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchUserData();
    fetchSchoolInfo();
  }, []);

  const fetchUserData = async () => {
    try {
      const userId = localStorage.getItem('currentUserId');
      if (!userId) {
        console.error('No userId found in localStorage');
        setLoading(false);
        return;
      }

      const response = await api.get(`/users/${userId}`);
      setUser(response.data);
      setFormData({
        firstname: response.data.firstname || '',
        lastname: response.data.lastname || '',
        email: response.data.email || '',
        contact_number: response.data.contact_number || '',
        position: response.data.position || '',
        employee_number: response.data.employee_number || '',
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
    }
  };

  const fetchSchoolInfo = async () => {
    try {
      const schoolId = localStorage.getItem('schoolId');
      if (!schoolId) return;

      const response = await api.get(`/schools/${schoolId}`);
      setSchoolInfo(response.data);
    } catch (error) {
      console.error('Error fetching school info:', error);
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setSaveMessage({ type: '', text: '' });
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      firstname: user?.firstname || '',
      lastname: user?.lastname || '',
      email: user?.email || '',
      contact_number: user?.contact_number || '',
      position: user?.position || '',
      employee_number: user?.employee_number || '',
    });
    setSaveMessage({ type: '', text: '' });
  };

  const handleSave = async () => {
    try {
      const userId = localStorage.getItem('currentUserId');
      const response = await api.put(`/users/${userId}`, formData);
      
      if (response.success || response.data) {
        setUser({ ...user, ...formData });
        setEditing(false);
        setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage({ type: 'error', text: 'Error updating profile. Please try again.' });
    }
  };

  if (loading) {
    return (
      <div className="animate-slide-up">
        <Card>
          <p className="text-sm text-[#64748B]">Loading profile...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1">Profile</h2>
        <p className="text-[#64748B] text-sm">Manage your personal information</p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <Card>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                <FiUser className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#0F172A]">
                  {user?.firstname} {user?.lastname}
                </h3>
                <p className="text-[#64748B] text-sm">{user?.position || 'Librarian'}</p>
                {schoolInfo && (
                  <p className="text-[#64748B] text-xs mt-1">{schoolInfo.school_name}</p>
                )}
              </div>
            </div>
            {!editing ? (
              <Button onClick={handleEdit} className="flex items-center gap-2">
                <FiEdit2 className="w-4 h-4" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleCancel} className="border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 flex items-center gap-2">
                  <FiX className="w-4 h-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-[#2563EB] hover:bg-blue-700 flex items-center gap-2">
                  <FiSave className="w-4 h-4" />
                  Save
                </Button>
              </div>
            )}
          </div>

          {saveMessage.text && (
            <div className={`mb-6 p-4 rounded-lg ${
              saveMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {saveMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#64748B]">First Name</label>
              <Input
                type="text"
                value={editing ? formData.firstname : user?.firstname || ''}
                onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                disabled={!editing}
                placeholder="First name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#64748B]">Last Name</label>
              <Input
                type="text"
                value={editing ? formData.lastname : user?.lastname || ''}
                onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                disabled={!editing}
                placeholder="Last name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#64748B]">Email</label>
              <Input
                type="email"
                value={editing ? formData.email : user?.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!editing}
                placeholder="Email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#64748B]">Contact Number</label>
              <Input
                type="tel"
                value={editing ? formData.contact_number : user?.contact_number || ''}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                disabled={!editing}
                placeholder="Contact number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#64748B]">Position</label>
              <Input
                type="text"
                value={editing ? formData.position : user?.position || ''}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                disabled={!editing}
                placeholder="Position"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#64748B]">Employee Number</label>
              <Input
                type="text"
                value={editing ? formData.employee_number : user?.employee_number || ''}
                onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                disabled={!editing}
                placeholder="Employee number"
              />
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
            <h4 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-4">Account Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <FiMail className="w-5 h-5 text-[#64748B]" />
                <div>
                  <p className="text-xs text-[#64748B]">Email</p>
                  <p className="text-sm text-[#0F172A]">{user?.email || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiCalendar className="w-5 h-5 text-[#64748B]" />
                <div>
                  <p className="text-xs text-[#64748B]">User ID</p>
                  <p className="text-sm text-[#0F172A]">{user?.user_id || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default LibrarianAdminProfile;
