import { useState, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { User, Mail, Phone, Calendar, Book, Edit, Camera, Lock, X } from 'lucide-react';
import { updateProfilePicture, changePassword, API_ORIGIN } from '../../../utils/api';
import { ProfileSkeleton } from '../../ui/Skeleton';

function StudentProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  useEffect(() => {
    if (!toast.show) return;

    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2600);

    return () => clearTimeout(timer);
  }, [toast.show]);

  // Construct profile picture URL using same logic as school logo
  const getProfilePictureUrl = (picture) => {
    if (!picture) return '';
    const apiOrigin = API_ORIGIN;
    if (
      picture.startsWith('http://') ||
      picture.startsWith('https://') ||
      picture.startsWith('data:') ||
      picture.startsWith('blob:')
    ) {
      return picture;
    }
    if (picture.startsWith('/')) return `${apiOrigin}${picture}`;
    return `${apiOrigin}/${picture}`;
  };

  const getProfilePictureValue = (userData) => userData?.profile_picture || userData?.profile_image || '';

  const createImage = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

  const dataUrlToFile = (dataUrl, filename) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  };

  const getCroppedImage = async (src, pixelCrop) => {
    if (!src || !pixelCrop) return src;

    const image = await createImage(src);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return src;

    const safeWidth = Math.max(1, Math.round(pixelCrop.width));
    const safeHeight = Math.max(1, Math.round(pixelCrop.height));

    canvas.width = safeWidth;
    canvas.height = safeHeight;

    ctx.drawImage(
      image,
      Math.round(pixelCrop.x),
      Math.round(pixelCrop.y),
      safeWidth,
      safeHeight,
      0,
      0,
      safeWidth,
      safeHeight
    );

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
          const userData = JSON.parse(userStr);
          const normalizedUser = {
            ...userData,
            profile_picture: userData.profile_picture || userData.profile_image || null,
            profile_image: userData.profile_picture || userData.profile_image || null,
          };

          setUser(normalizedUser);

          const storedPicture = getProfilePictureValue(normalizedUser);
          if (storedPicture) {
            setProfilePicturePreview(getProfilePictureUrl(storedPicture));
          }
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        setImageSrc(result);
        setProfilePicturePreview(result);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePictureUpload = async () => {
    if (!profilePicture) return;

    try {
      setUploading(true);

      let fileToUpload = profilePicture;
      if (imageSrc && croppedAreaPixels) {
        const croppedImageDataUrl = await getCroppedImage(imageSrc, croppedAreaPixels);
        fileToUpload = dataUrlToFile(croppedImageDataUrl, profilePicture.name || 'profile-picture.jpg');
      }

      const { data, error } = await updateProfilePicture(fileToUpload);

      if (error) throw error;

      const savedProfilePicture = data?.profile_picture || data?.profile_image;
      if (savedProfilePicture) {
        const profilePictureUrl = getProfilePictureUrl(savedProfilePicture);
        const updatedUser = {
          ...user,
          profile_picture: savedProfilePicture,
          profile_image: savedProfilePicture,
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setProfilePicturePreview(profilePictureUrl);
      }

      setProfilePicture(null);
      setImageSrc('');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setShowEditModal(false);
      showToast('success', 'Profile picture updated successfully!');
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      showToast('error', err.message || 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    try {
      const { data, error } = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);

      if (error) throw error;

      setPasswordSuccess('Password changed successfully!');
      showToast('success', 'Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Error changing password:', err);
      const message = err.message || 'Failed to change password. Please try again.';
      setPasswordError(message);
      showToast('error', message);
    }
  };

  if (loading) {
    return (
      <div className="animate-slide-up">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Profile</h2>
        <ProfileSkeleton />
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {toast.show && (
        <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-1rem)] max-w-[420px] -translate-x-1/2">
          <div
            className={[
              'relative flex items-center gap-2 overflow-hidden rounded-full border border-white/50 bg-white/35 px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.12)] backdrop-blur-md',
              toast.type === 'success' ? 'text-slate-700' : 'text-slate-700',
            ].join(' ')}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-[11px] font-bold text-slate-700">
              {toast.type === 'success' ? '✓' : '!'}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold text-slate-800">
                {toast.message}
              </div>
            </div>

            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/70 bg-slate-200/80 shadow-sm">
              {profilePicturePreview ? (
                <img src={profilePicturePreview} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-[10px] font-bold text-white">
                  {user?.first_name?.[0] || user?.name?.[0] || 'U'}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="ml-1 text-slate-500 transition hover:text-slate-700"
              aria-label="Close notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Profile</h2>
      
      <div className="rounded-xl p-4 sm:p-6 shadow-lg bg-white">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg overflow-hidden">
              {profilePicturePreview ? (
                <img src={profilePicturePreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.first_name?.[0] || user?.name?.[0] || 'U'
              )}
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="absolute bottom-0 right-0 w-10 h-10 min-h-[40px] min-w-[40px] bg-[#2D8AC4] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#2570a0] transition-colors active:scale-95"
              aria-label="Change profile picture"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {user?.first_name || user?.name || 'User'} {user?.last_name || ''}
            </h3>
            <p className="text-sm text-gray-600">
              {user?.role_name || 'Student'}
            </p>
          </div>
        </div>

        {/* Profile Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Full Name</p>
              <p className="font-medium text-gray-900">
                {user?.first_name || user?.name || 'N/A'} {user?.last_name || ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-medium text-gray-900">
                {user?.email || 'N/A'}
              </p>
            </div>
          </div>

          {user?.student_number && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100">
                <Book className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Student Number</p>
                <p className="font-medium text-gray-900">
                  {user.student_number}
                </p>
              </div>
            </div>
          )}

          {user?.gender && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100">
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Gender</p>
                <p className="font-medium text-gray-900">
                  {user.gender}
                </p>
              </div>
            </div>
          )}

          {user?.contact_number && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-pink-100">
                <Phone className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Contact Number</p>
                <p className="font-medium text-gray-900">
                  {user.contact_number}
                </p>
              </div>
            </div>
          )}

          {user?.school_name && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-100">
                <Book className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">School</p>
                <p className="font-medium text-gray-900">
                  {user.school_name}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
          <button
          onClick={() => setShowPasswordModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 min-h-[48px] bg-gradient-to-r from-[#2D8AC4] to-[#1a5a8a] hover:from-[#2570a0] hover:to-[#144a70] text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          aria-label="Change password"
        >
          <Lock className="w-4 h-4" />
          Change Password
        </button>
        </div>
      </div>

      {/* Profile Picture Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Change Profile Picture</h3>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              {imageSrc ? (
                <div className="relative mx-auto h-64 w-full overflow-hidden rounded-2xl bg-gray-100">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                  />
                </div>
              ) : (
                <div className="relative w-32 h-32 mx-auto rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                  {profilePicturePreview ? (
                    <img src={profilePicturePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-12 h-12 text-gray-400" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              )}

              {imageSrc && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Zoom</label>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-[#2D8AC4]"
                  />
                </div>
              )}

              {!imageSrc && (
                <p className="text-center text-sm text-gray-500 mt-2">Click to upload image</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setProfilePicture(null);
                  setImageSrc('');
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                  setCroppedAreaPixels(null);
                  setProfilePicturePreview(getProfilePictureValue(user) || '');
                }}
                className="flex-1 px-4 py-2.5 min-h-[44px] border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all"
                aria-label="Cancel profile picture change"
              >
                Cancel
              </button>
              <button
                onClick={handleProfilePictureUpload}
                disabled={!profilePicture || uploading}
                className="flex-1 px-4 py-2.5 min-h-[44px] bg-[#2D8AC4] text-white rounded-lg hover:bg-[#2570a0] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                aria-label="Save profile picture"
              >
                {uploading ? 'Uploading...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
              <button 
                onClick={() => setShowPasswordModal(false)} 
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close password modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{passwordSuccess}</p>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D8AC4] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D8AC4] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D8AC4] focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="flex-1 px-4 py-2.5 min-h-[44px] border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all"
                  aria-label="Cancel password change"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 min-h-[44px] bg-[#2D8AC4] text-white rounded-lg hover:bg-[#2570a0] active:scale-[0.98] transition-all"
                  aria-label="Submit password change"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentProfile;
