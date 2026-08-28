import { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { User, Mail, Phone, Book, Camera, X, History, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updateProfilePicture, API_ORIGIN } from '../../../utils/api';
import { ProfileSkeleton } from '../../ui/Skeleton';

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
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });
  const profileModalCloseRef = useRef(null);

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

  if (loading) {
    return (
      <div className="animate-slide-up mx-auto w-full max-w-[1080px] min-w-0">
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Profile</h1>
        <ProfileSkeleton />
      </div>
    );
  }

  const displayName = getDisplayName(user);
  const roleName = user?.role_name || 'Student';
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

      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-3xl">Profile</h1>
        <p className="mt-1 max-w-[55ch] text-sm leading-6 text-slate-500">
          Your account information and library identity.
        </p>
      </header>

      <section aria-labelledby="profile-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.34)] sm:p-6">
        <div className="flex min-w-0 flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
          <div className="relative w-fit shrink-0">
            <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-[#EAF6FB] text-xl font-bold text-[#0077B6] sm:h-20 sm:w-20 sm:text-2xl">
              {profilePicturePreview ? (
                <img src={profilePicturePreview} alt={`${displayName} profile`} className="h-full w-full object-cover" />
              ) : (
                getInitials(user)
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="absolute -bottom-1 -right-1 flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 border-white bg-[#0077B6] text-white shadow-sm transition hover:bg-[#005F8F] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6] focus-visible:ring-offset-2"
              aria-label="Change profile picture"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="min-w-0">
            <h2 id="profile-heading" className="break-words text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
              {displayName}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{roleName}</p>
          </div>
        </div>

        <div className="mt-6 grid min-w-0 gap-x-8 gap-y-6 lg:grid-cols-2">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-picture-dialog-title"
            aria-describedby="profile-picture-dialog-description"
            className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-[0_24px_70px_-28px_rgba(15,23,42,0.45)] sm:max-h-[calc(100dvh-2rem)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0077B6]">Profile photo</p>
                <h2 id="profile-picture-dialog-title" className="mt-1 text-lg font-bold text-slate-900">Update your photo</h2>
                <p id="profile-picture-dialog-description" className="mt-1 text-xs leading-5 text-slate-500">
                  Choose a clear photo for your Libralink account.
                </p>
              </div>
              <button
                type="button"
                ref={profileModalCloseRef}
                onClick={closeEditModal}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6]"
                aria-label="Close profile picture dialog"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {imageSrc ? (
                <div className="relative h-56 w-full overflow-hidden rounded-lg bg-slate-950 sm:h-64">
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
                <div>
                  <label
                    htmlFor="profile-picture-file"
                    className="relative mx-auto flex h-36 w-36 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-[#0077B6] hover:bg-[#EAF6FB]"
                  >
                    {profilePicturePreview ? (
                      <img src={profilePicturePreview} alt="Profile preview" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-10 w-10" aria-hidden="true" />
                    )}
                    <input
                      id="profile-picture-file"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      aria-label="Choose a profile picture"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                  <p className="mt-3 text-center text-xs text-slate-500">Click the circle to choose an image.</p>
                </div>
              )}

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

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={uploading}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6] focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProfilePictureUpload}
                  disabled={!profilePicture || uploading}
                  aria-busy={uploading}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#0077B6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#005F8F] active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0077B6] focus-visible:ring-offset-2"
                >
                  {uploading ? (
                    <>
                      <LockKeyhole className="h-4 w-4 animate-pulse" aria-hidden="true" />
                      Uploading...
                    </>
                  ) : (
                    'Save photo'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentProfile;
