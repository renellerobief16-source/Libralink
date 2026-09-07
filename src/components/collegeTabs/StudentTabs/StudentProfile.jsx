import { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { User, Mail, Phone, Book, Camera, X, History, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updateProfilePicture, updateUserProfile, API_ORIGIN } from '../../../utils/api';

const getDisplayName = (userData) => {
  const firstName = userData?.first_name || userData?.name || '';
  const lastName = userData?.last_name || '';
  return `${firstName} ${lastName}`.trim() || 'User';
};

const getInitials = (userData) => {
  const firstName = userData?.first_name || userData?.name || '';
  const lastName = userData?.last_name || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();
  return initials.toUpperCase() || 'U';
};

function ProfileRecordRow({ icon: Icon, label, value }) {
  return (
    <div className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-start gap-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold leading-5 text-slate-900 [overflow-wrap:anywhere]">
          {value || 'Not provided'}
        </p>
      </div>
    </div>
  );
}

function ProfileRecordGroup({ title, children }) {
  return (
    <section aria-label={title} className="min-w-0">
      <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </h2>
      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function StudentProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    contactNumber: '',
    studentNumber: '',
    schoolName: '',
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });
  const profileModalCloseRef = useRef(null);
  const profilePictureInputRef = useRef(null);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  useEffect(() => {
    if (!toast.show) return undefined;

    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2600);

    return () => clearTimeout(timer);
  }, [toast.show]);

  // Construct profile picture URL using the same logic as the school logo.
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
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

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
  };

  const openEditModal = () => {
    setProfileForm({
      fullName: getDisplayName(user),
      email: user?.email || '',
      contactNumber: user?.contact_number || '',
      studentNumber: user?.student_number || '',
      schoolName: user?.school_name || '',
    });
    setShowEditModal(true);
  };

  const handleProfileFormChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();

    if (!user?.user_id) return;

    try {
      setSavingProfile(true);
      const { data, error } = await updateUserProfile(user.user_id, {
        firstname: profileForm.fullName.trim().split(/\s+/)[0] || '',
        lastname: profileForm.fullName.trim().split(/\s+/).slice(1).join(' '),
        email: profileForm.email.trim(),
        contact_number: profileForm.contactNumber.trim(),
        student_number: profileForm.studentNumber.trim(),
        school_name: profileForm.schoolName.trim(),
      });

      if (error) throw error;

      let savedProfilePicture = getProfilePictureValue(user);
      if (profilePicture) {
        setUploading(true);

        let fileToUpload = profilePicture;
        if (imageSrc && croppedAreaPixels) {
          const croppedImageDataUrl = await getCroppedImage(imageSrc, croppedAreaPixels);
          fileToUpload = dataUrlToFile(croppedImageDataUrl, profilePicture.name || 'profile-picture.jpg');
        }

        const pictureResponse = await updateProfilePicture(fileToUpload);
        if (pictureResponse.error) throw pictureResponse.error;
        savedProfilePicture = pictureResponse.data?.profile_picture || pictureResponse.data?.profile_image;
        if (!savedProfilePicture) throw new Error('Profile picture was not saved.');
      }

      const updatedUser = {
        ...user,
        first_name: profileForm.fullName.trim().split(/\s+/)[0] || '',
        last_name: profileForm.fullName.trim().split(/\s+/).slice(1).join(' '),
        name: profileForm.fullName.trim(),
        full_name: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
        contact_number: profileForm.contactNumber.trim(),
        student_number: profileForm.studentNumber.trim(),
        school_name: profileForm.schoolName.trim(),
        profile_picture: savedProfilePicture,
        profile_image: savedProfilePicture,
        ...(data?.data || {}),
      };

      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('libralink-user-changed'));
      setUser(updatedUser);
      setProfilePicture(null);
      setImageSrc('');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setProfilePicturePreview(getProfilePictureUrl(savedProfilePicture));
      setShowEditModal(false);
      showToast('success', 'Profile updated successfully.');
    } catch (err) {
      console.error('Error updating profile:', err);
      showToast('error', err.message || 'Failed to update profile. Please try again.');
    } finally {
      setUploading(false);
      setSavingProfile(false);
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
        window.dispatchEvent(new Event('libralink-user-changed'));
        setUser(updatedUser);
        setProfilePicturePreview(profilePictureUrl);
      }

      setProfilePicture(null);
      setImageSrc('');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setShowEditModal(false);
      showToast('success', 'Profile picture updated successfully.');
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      showToast('error', err.message || 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resetProfilePictureDraft = () => {
    setProfilePicture(null);
    setImageSrc('');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setProfilePicturePreview(getProfilePictureUrl(getProfilePictureValue(user)));
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    resetProfilePictureDraft();
  };

  useEffect(() => {
    if (!showEditModal) return undefined;

    const previouslyFocused = document.activeElement;
    const focusFrame = window.requestAnimationFrame(() => profileModalCloseRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeEditModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [showEditModal]);

  const displayName = getDisplayName(user);
  const hasContactDetails = Boolean(user?.contact_number);
  const hasStudentDetails = Boolean(user?.student_number || user?.gender || user?.school_name);

  return (
    <div className="animate-slide-up mx-auto w-full max-w-[1080px] min-w-0 overflow-x-hidden">
      {toast.show && (
        <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-1.5rem)] max-w-[420px] -translate-x-1/2">
          <div
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            className={`flex items-start gap-3 rounded-xl border bg-white px-3 py-3 shadow-[0_16px_36px_-18px_rgba(15,23,42,0.35)] ${
              toast.type === 'success' ? 'border-emerald-200' : 'border-red-200'
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                toast.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {toast.type === 'success' ? '✓' : '!'}
            </div>
            <p className="min-w-0 flex-1 break-words pt-1 text-xs font-semibold leading-5 text-slate-800">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6]"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 md:hidden">Profile</h1>
        <button
          onClick={() => navigate('/studentpage/settings')}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          title="Settings"
          aria-label="Open profile settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      <section aria-labelledby="profile-heading" className="min-w-0">
        <div className="flex min-w-0 flex-col items-center text-center">
          <div className="relative w-fit shrink-0">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#EAF6FB] text-2xl font-bold text-[#0077B6]">
              {profilePicturePreview ? (
                <img src={profilePicturePreview} alt={`${displayName} profile`} className="h-full w-full object-cover" />
              ) : (
                getInitials(user)
              )}
            </div>
            <button
              type="button"
              onClick={openEditModal}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#0077B6] text-white shadow-sm transition hover:bg-[#005F8F] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6] focus-visible:ring-offset-2"
              aria-label="Change profile picture"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 min-w-0">
            <h1 className="break-words text-[28px] font-bold leading-tight tracking-[-0.03em] text-slate-950">
              {displayName}
            </h1>
            <p id="profile-heading" className="mt-2 text-sm text-slate-500">@{displayName.toLowerCase().replace(/\s+/g, '')}</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                className="rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-300"
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
              >
                Share
              </button>
              <button
                type="button"
                onClick={openEditModal}
                className="rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-300"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid min-w-0 gap-x-8 gap-y-6 border-t border-slate-200 pt-5 lg:grid-cols-2">
          <ProfileRecordGroup title="Personal details">
            <ProfileRecordRow icon={User} label="Full name" value={displayName} />
            <ProfileRecordRow icon={Mail} label="Email" value={user?.email} />
          </ProfileRecordGroup>

          {hasContactDetails && (
            <ProfileRecordGroup title="Contact">
              <ProfileRecordRow icon={Phone} label="Contact number" value={user.contact_number} />
            </ProfileRecordGroup>
          )}
        </div>

        {hasStudentDetails && (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <ProfileRecordGroup title="Student record">
              {user?.student_number && (
                <ProfileRecordRow icon={Book} label="Student number" value={user.student_number} />
              )}
              {user?.gender && <ProfileRecordRow icon={User} label="Gender" value={user.gender} />}
              {user?.school_name && <ProfileRecordRow icon={Book} label="School" value={user.school_name} />}
            </ProfileRecordGroup>
          </div>
        )}

        <div className="mt-6 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={() => navigate('/studentpage/history')}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0077B6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#005F8F] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6] focus-visible:ring-offset-2"
            aria-label="View borrow history"
          >
            <History className="h-4 w-4" aria-hidden="true" />
            Borrow History
          </button>
        </div>
      </section>

      {showEditModal && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-hidden bg-white"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-dialog-title"
            aria-describedby="edit-profile-dialog-description"
            className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-white"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <form onSubmit={handleProfileSave} className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-5">
              <button
                type="button"
                ref={profileModalCloseRef}
                onClick={closeEditModal}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-800 transition hover:bg-slate-100"
                aria-label="Close edit profile"
              >
                <span aria-hidden="true">&#8249;</span>
              </button>
              <h2 id="edit-profile-dialog-title" className="text-lg font-bold text-slate-950">Edit profile</h2>
              <button
                type="submit"
                disabled={savingProfile || uploading}
                className="rounded-full bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Done'}
              </button>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-2 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-3">
                <p id="edit-profile-dialog-description" className="text-sm leading-5 text-slate-700">
                  Keep your personal details private. Information you add here is visible to anyone who can view your profile.
                </p>

                <div className="flex flex-col items-center gap-3">
              {imageSrc ? (
                <div className="relative h-32 w-32 overflow-hidden rounded-full bg-slate-950">
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
                <div className="flex flex-col items-center">
                  <label
                    htmlFor="profile-picture-file"
                    className="relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400 transition hover:bg-slate-200"
                  >
                    {profilePicturePreview ? (
                      <img src={profilePicturePreview} alt="Profile preview" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-10 w-10" aria-hidden="true" />
                    )}
                  </label>
                  <p className="mt-2 text-center text-xs text-slate-500">Click the circle to choose an image.</p>
                </div>
              )}

              <label htmlFor="profile-picture-file" className="cursor-pointer rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-300">
                Change
              </label>
              <input
                ref={profilePictureInputRef}
                id="profile-picture-file"
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                aria-label="Choose a profile picture"
                className="sr-only"
              />
                </div>

              {imageSrc && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label htmlFor="profile-picture-zoom" className="text-xs font-semibold text-slate-700">Zoom</label>
                    <span className="text-xs text-slate-500">{zoom.toFixed(1)}x</span>
                  </div>
                  <input
                    id="profile-picture-zoom"
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="h-2 w-full accent-[#0077B6]"
                  />
                </div>
              )}

              {[
                ['fullName', 'Full name', profileForm.fullName],
                ['email', 'Email', profileForm.email],
                ['contactNumber', 'Contact number', profileForm.contactNumber],
                ['studentNumber', 'Student number', profileForm.studentNumber],
                ['schoolName', 'School', profileForm.schoolName],
              ].map(([name, label, value]) => (
                <label key={name} className="block rounded-2xl border border-slate-300 px-4 py-2.5 focus-within:border-slate-500">
                  <span className="block text-[11px] font-medium text-slate-700">{label}</span>
                  <input
                    name={name}
                    type={name === 'email' ? 'email' : 'text'}
                    value={value}
                    onChange={handleProfileFormChange}
                    required={['fullName', 'email'].includes(name)}
                    className="mt-1 w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                  />
                </label>
              ))}

              {profilePicture && (
                <button
                  type="button"
                  onClick={handleProfilePictureUpload}
                  disabled={uploading || savingProfile}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {uploading ? 'Uploading photo...' : 'Save photo'}
                </button>
              )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentProfile;
