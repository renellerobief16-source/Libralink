import { useState, useEffect, useRef } from "react";
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiCalendar, 
  FiEdit2, 
  FiSave, 
  FiX, 
  FiCamera, 
  FiShield, 
  FiCheckCircle, 
  FiLock, 
  FiBriefcase, 
  FiHash,
  FiArrowRight,
  FiRefreshCw
} from "react-icons/fi";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import api, { updateProfilePicture, updateUserProfile, getBackendAssetUrl } from "../../../utils/api";

function LibrarianAdminProfile({ onNavigate }) {
  const [user, setUser] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    contact_number: '',
    position: '',
    employee_number: '',
  });

  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const photoInputRef = useRef(null);

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
      const userData = response.data;
      setUser(userData);
      setFormData({
        firstname: userData.firstname || '',
        lastname: userData.lastname || '',
        email: userData.email || '',
        contact_number: userData.contact_number || '',
        position: userData.position && userData.position.toLowerCase() !== 'position' ? userData.position : 'Head Librarian',
        employee_number: userData.employee_number && userData.employee_number.toLowerCase() !== 'none' ? userData.employee_number : '',
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

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveMessage({ type: 'error', text: 'Please select a valid image file (JPG, PNG, or WEBP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage({ type: 'error', text: 'Image size must be less than 5MB.' });
      return;
    }

    setUploadingPhoto(true);
    setSaveMessage({ type: '', text: '' });

    try {
      const { data, error } = await updateProfilePicture(file);
      if (error) throw error;

      const newImageUrl = data?.profile_picture || data?.profile_image;
      if (newImageUrl) {
        setUser((prev) => ({
          ...prev,
          profile_image: newImageUrl,
          profile_picture: newImageUrl,
        }));

        // Update local storage so top navbar and other components update
        const stored = localStorage.getItem('currentUser');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            parsed.profile_image = newImageUrl;
            parsed.profile_picture = newImageUrl;
            localStorage.setItem('currentUser', JSON.stringify(parsed));
          } catch {
            // ignore JSON error
          }
        }

        // Notify app shell
        window.dispatchEvent(new Event('libralink-user-changed'));
        setSaveMessage({ type: 'success', text: 'Profile picture updated successfully!' });
        setTimeout(() => setSaveMessage({ type: '', text: '' }), 4000);
      }
    } catch (err) {
      console.error('Error updating profile picture:', err);
      setSaveMessage({ type: 'error', text: err.message || 'Failed to upload profile picture.' });
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
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
      position: user?.position && user.position.toLowerCase() !== 'position' ? user.position : 'Head Librarian',
      employee_number: user?.employee_number && user.employee_number.toLowerCase() !== 'none' ? user.employee_number : '',
    });
    setSaveMessage({ type: '', text: '' });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage({ type: '', text: '' });

    try {
      const userId = localStorage.getItem('currentUserId');
      if (!userId) throw new Error('No user ID found');

      const payload = {
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        email: formData.email.trim(),
        contact_number: formData.contact_number.trim(),
        position: formData.position.trim(),
        employee_number: formData.employee_number.trim(),
      };

      const response = await api.put(`/users/${userId}`, payload);

      if (response.success || response.data || response.status === 200) {
        setUser((prev) => ({ ...prev, ...payload }));

        // Update localStorage
        const stored = localStorage.getItem('currentUser');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            Object.assign(parsed, payload);
            localStorage.setItem('currentUser', JSON.stringify(parsed));
          } catch {
            // ignore
          }
        }

        // Notify app shell
        window.dispatchEvent(new Event('libralink-user-changed'));

        setEditing(false);
        setSaveMessage({ type: 'success', text: 'Profile information updated successfully!' });
        setTimeout(() => setSaveMessage({ type: '', text: '' }), 4000);
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to update profile.' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage({ type: 'error', text: error.response?.data?.message || error.message || 'Error saving profile changes.' });
    } finally {
      setSaving(false);
    }
  };

  const fullName = `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || 'Administrator';
  const initials = `${user?.firstname?.[0] || 'A'}${user?.lastname?.[0] || 'L'}`.toUpperCase();
  const displayPosition = user?.position && user.position.toLowerCase() !== 'position' ? user.position : 'Head Librarian';
  const displayEmpNo = user?.employee_number && user.employee_number.toLowerCase() !== 'none' ? user.employee_number : 'Not set';

  if (loading) {
    return (
      <div className="animate-slide-up space-y-6">
        <Card>
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500">Loading profile data...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      {/* Toast Alert */}
      {saveMessage.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-xs ${
          saveMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {saveMessage.type === 'success' ? (
            <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <FiX className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{saveMessage.text}</span>
        </div>
      )}

      {/* Hero Profile Banner Header */}
      <div className="relative rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
        {/* Cover Background Graphic */}
        <div className="h-36 sm:h-44 w-full bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
          <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-white/10 rounded-full blur-xl" />
          <div className="absolute top-4 right-6 hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-semibold border border-white/20">
            <FiShield className="w-3.5 h-3.5 text-blue-200" />
            <span>LibraLink Consortium Campus Admin</span>
          </div>
        </div>

        {/* Profile Content Container */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-5 -mt-16 sm:-mt-20 mb-4">
            {/* Interactive Avatar */}
            <div className="relative group shrink-0">
              <div className="w-28 sm:w-36 h-28 sm:h-36 rounded-3xl p-1 bg-white shadow-xl shadow-slate-900/15 border-2 border-white overflow-hidden flex items-center justify-center">
                {user?.profile_image ? (
                  <img
                    src={getBackendAssetUrl(user.profile_image)}
                    alt={fullName}
                    className="w-full h-full object-cover rounded-2xl"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 text-white font-black text-3xl sm:text-4xl flex items-center justify-center rounded-2xl shadow-inner">
                    {initials}
                  </div>
                )}
              </div>

              {/* Camera Upload Overlay Trigger */}
              <input
                type="file"
                ref={photoInputRef}
                onChange={handlePhotoSelect}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-1 right-1 p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-2 border-white transition-transform hover:scale-110 cursor-pointer disabled:opacity-50"
                title="Change Profile Photo"
              >
                {uploadingPhoto ? (
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FiCamera className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Header Action Controls */}
            <div className="flex items-center gap-2">
              {!editing ? (
                <Button
                  onClick={handleEdit}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <FiEdit2 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
                  >
                    Cancel
                  </button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FiSave className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* User Name & Badges */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {fullName}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  <FiShield className="w-3 h-3 text-blue-600" />
                  <span>Librarian Admin</span>
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active Account</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <FiBriefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>{displayPosition}</span>
              </span>

              {schoolInfo && (
                <span className="flex items-center gap-1.5">
                  <FiMapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>{schoolInfo.school_name} {schoolInfo.school_code ? `(${schoolInfo.school_code})` : ''}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Personal Details & Professional Role */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Personal & Professional Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Personal & Contact Information */}
          <Card>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FiUser className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Personal & Contact Information</h2>
                <p className="text-xs text-slate-500">Your personal details and primary communication channel</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  First Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.firstname}
                    onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                    placeholder="Enter first name"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                ) : (
                  <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800">
                    {user?.firstname || '—'}
                  </div>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Last Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.lastname}
                    onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                    placeholder="Enter last name"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                ) : (
                  <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800">
                    {user?.lastname || '—'}
                  </div>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FiMail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Official Email Address</span>
                </label>
                {editing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@school.edu.ph"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                ) : (
                  <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 truncate" title={user?.email}>
                    {user?.email || '—'}
                  </div>
                )}
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FiPhone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Contact / Mobile Number</span>
                </label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    placeholder="e.g. 0917-123-4567"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                ) : (
                  <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800">
                    {user?.contact_number || '—'}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Card 2: Professional & Institutional Role */}
          <Card>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <FiBriefcase className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Professional & Institutional Position</h2>
                <p className="text-xs text-slate-500">Designation within the campus library system and employee credentials</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Position */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Designation / Position
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="e.g. Chief Librarian / Administrator"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                ) : (
                  <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800">
                    {displayPosition}
                  </div>
                )}
              </div>

              {/* Employee Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Employee ID Number
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.employee_number}
                    onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                    placeholder="e.g. EMP-2024-0018"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                ) : (
                  <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-mono font-semibold text-slate-800">
                    {displayEmpNo}
                  </div>
                )}
              </div>

              {/* Campus Library Assignment */}
              <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 sm:col-span-2">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <FiMapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Institution Affiliation</span>
                </div>
                <p className="text-xs font-bold text-slate-800">
                  {schoolInfo?.school_name || 'Campus Library'} {schoolInfo?.school_code ? `• ${schoolInfo.school_code}` : ''}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You are registered as the primary campus library administrator.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (1 Col): Account & Security Card */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <FiLock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Account & Security</h2>
                <p className="text-xs text-slate-500">Security credentials and ID</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* User ID */}
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Account User ID
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    #{user?.user_id || 'N/A'}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                  UID
                </span>
              </div>

              {/* Privilege Level */}
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Access Level
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700">
                  <FiShield className="w-3.5 h-3.5" />
                  <span>College Librarian Administrator</span>
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Authorized to manage books, patrons, loan policies, and catalog circulation.
                </p>
              </div>

              {/* Password Action */}
              <div className="pt-2 border-t border-slate-100">
                <Button
                  onClick={() => onNavigate && onNavigate('change-password')}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200"
                >
                  <FiLock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Change Password</span>
                  <FiArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LibrarianAdminProfile;
