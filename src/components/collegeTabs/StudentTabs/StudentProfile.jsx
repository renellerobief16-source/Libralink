import { useEffect, useRef, useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Book,
  Camera,
  X,
  History,
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Edit3,
  ArrowRight,
  Sparkles,
  Building2,
  CreditCard,
  RefreshCw,
  Barcode,
  Save,
  Clock,
  Heart,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { updateProfilePicture, updateUserProfile, API_ORIGIN, getLibraryPolicy } from '../../../utils/api';

const getDisplayName = (userData) => {
  const firstName = userData?.first_name || userData?.name || '';
  const lastName = userData?.last_name || '';
  return `${firstName} ${lastName}`.trim() || 'Student';
};

const getInitials = (userData) => {
  const firstName = userData?.first_name || userData?.name || '';
  const lastName = userData?.last_name || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();
  return initials.toUpperCase() || 'ST';
};

function StudentProfile({ isDrawer = false, onClose, onSwitchTab }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [profilePreview, setProfilePreview] = useState('');
  const [imageError, setImageError] = useState(false);
  const [showFinesInfo, setShowFinesInfo] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  const [libraryStats, setLibraryStats] = useState({
    activeLoans: 0,
    maxLoans: 5,
    pendingRequests: 0,
    fines: '₱0.00',
  });

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    studentNumber: '',
    schoolName: '',
  });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  useEffect(() => {
    if (!toast.show) return undefined;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2800);
    return () => clearTimeout(timer);
  }, [toast.show]);

  const getProfilePictureUrl = (picture) => {
    if (!picture) return '';
    if (
      picture.startsWith('http://') ||
      picture.startsWith('https://') ||
      picture.startsWith('data:') ||
      picture.startsWith('blob:')
    ) {
      return picture;
    }
    if (picture.startsWith('/')) return `${API_ORIGIN}${picture}`;
    return `${API_ORIGIN}/${picture}`;
  };

  // Load user profile
  useEffect(() => {
    const loadProfile = () => {
      try {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
          const parsed = JSON.parse(stored);
          const normalized = {
            ...parsed,
            profile_picture: parsed.profile_picture || parsed.profile_image || null,
          };
          const uId = parsed.user_id || parsed.id;
          const cached = uId ? localStorage.getItem(`libralink_avatar_${uId}`) : null;
          setUser(normalized);
          setImageError(false);
          const picUrl = getProfilePictureUrl(normalized.profile_picture);
          setProfilePreview(picUrl || cached || '');

          const fName = normalized.first_name || normalized.name?.split(' ')[0] || '';
          const lName =
            normalized.last_name ||
            normalized.name?.split(' ').slice(1).join(' ') ||
            '';

          setEditForm({
            firstName: fName,
            lastName: lName,
            email: normalized.email || '',
            contactNumber: normalized.contactNumber || normalized.contact_number || '',
            studentNumber: normalized.studentNumber || normalized.student_number || '',
            schoolName: normalized.schoolName || normalized.school_name || normalized.school_code || '',
          });
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    // Listen to profile updates
    const handleUserChanged = () => loadProfile();
    window.addEventListener('libralink-user-changed', handleUserChanged);
    return () => window.removeEventListener('libralink-user-changed', handleUserChanged);
  }, []);

  // Fetch live library stats
  useEffect(() => {
    let isMounted = true;
    const fetchLibraryStats = async () => {
      try {
        const res = await api.get('/borrow-requests/my-requests');
        const requests = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res)
          ? res
          : [];

        let active = 0;
        let pending = 0;

        requests.forEach((req) => {
          const items = Array.isArray(req.items) && req.items.length > 0 ? req.items : [{}];
          items.forEach((item) => {
            const status = (item.status || req.status || '').toLowerCase();
            if (['approved', 'borrowed', 'picked_up', 'active'].includes(status)) {
              active++;
            } else if (['pending', 'requested'].includes(status)) {
              pending++;
            }
          });
        });

        let maxLoans = 5;
        try {
          const rawUser = localStorage.getItem('currentUser');
          const parsedUser = rawUser ? JSON.parse(rawUser) : null;
          const schoolId = localStorage.getItem('schoolId') || parsedUser?.school_id || parsedUser?.schoolId;
          
          if (schoolId) {
            const policyRes = await getLibraryPolicy(schoolId);
            if (policyRes.data && policyRes.data.max_borrow_limit !== undefined) {
              maxLoans = parseInt(policyRes.data.max_borrow_limit, 10) || 5;
            }
          }
        } catch (e) {
          console.error("Failed to fetch library policy limits", e);
        }

        if (isMounted) {
          setLibraryStats({
            activeLoans: active,
            maxLoans,
            pendingRequests: pending,
            fines: '₱0.00',
          });
        }
      } catch (err) {
        // Silently keep default stats if backend route is unavailable
      }
    };

    fetchLibraryStats();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle instant photo upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please choose a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Image size should be less than 5MB.');
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setImageError(false);
    setProfilePreview(localPreviewUrl);

    // Cache image data URL locally for resilient offline/fallback persistence
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const uId = user?.user_id || user?.id;
        if (uId && typeof reader.result === 'string') {
          localStorage.setItem(`libralink_avatar_${uId}`, reader.result);
        }
      };
      reader.readAsDataURL(file);
    } catch (cacheErr) {
      console.warn('Could not cache avatar locally:', cacheErr);
    }

    try {
      setUploadingPhoto(true);
      const { data, error } = await updateProfilePicture(file);
      if (error) throw error;

      const savedPicture = data?.profile_picture || data?.profile_image;
      const updatedUser = {
        ...user,
        profile_picture: savedPicture,
        profile_image: savedPicture,
      };

      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('libralink-user-changed'));
      setUser(updatedUser);
      setProfilePreview(getProfilePictureUrl(savedPicture));
      showToast('success', 'Profile photo updated successfully!');
    } catch (err) {
      console.error('Failed to upload photo:', err);
      showToast('error', err.message || 'Failed to update photo. Please try again.');
      setProfilePreview(getProfilePictureUrl(user?.profile_picture));
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle profile form save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.user_id) return;

    try {
      setSavingProfile(true);
      const payload = {
        firstname: editForm.firstName.trim(),
        lastname: editForm.lastName.trim(),
        email: editForm.email.trim(),
        contact_number: editForm.contactNumber.trim(),
        student_number: editForm.studentNumber.trim(),
        school_name: editForm.schoolName.trim(),
      };

      const { data, error } = await updateUserProfile(user.user_id, payload);
      if (error) throw error;

      const fullName = `${payload.firstname} ${payload.lastname}`.trim();
      const updatedUser = {
        ...user,
        first_name: payload.firstname,
        last_name: payload.lastname,
        name: fullName,
        full_name: fullName,
        email: payload.email,
        contact_number: payload.contact_number,
        student_number: payload.student_number,
        school_name: payload.school_name,
        ...(data?.data || {}),
      };

      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('libralink-user-changed'));
      setUser(updatedUser);
      setIsEditing(false);
      showToast('success', 'Profile records updated successfully.');
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast('error', err.message || 'Failed to save changes.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleNavigateTo = (panelOrRoute) => {
    if (onSwitchTab) {
      onSwitchTab(panelOrRoute);
    } else {
      navigate(`/studentpage/${panelOrRoute}`);
    }
  };

  const displayName = getDisplayName(user);
  const initials = getInitials(user);
  const studentNumber = user?.student_number || '2026-LIB-ST';
  const schoolName = user?.school_name || user?.school_code || 'Main Campus Library';

  return (
    <div className={`w-full ${isDrawer ? 'max-w-[380px]' : 'max-w-[500px] py-6 px-3 sm:px-0'} mx-auto min-w-0 text-slate-800`}>
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
          <div
            role="alert"
            className={`flex items-center gap-3 p-3.5 rounded-xl border bg-white border-slate-200 backdrop-blur-md ${
              toast.type === 'success'
                ? 'border-emerald-300 text-emerald-900'
                : 'border-rose-300 text-rose-900'
            }`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                toast.type === 'success'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
            </div>
            <p className="flex-1 text-xs font-semibold leading-relaxed break-words">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              aria-label="Close alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Unified Switch: Profile & ID vs Settings */}
      <div className="mb-4 flex items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/80">
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all bg-white text-blue-600 border border-slate-300"
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>Profile & Library ID</span>
        </button>
        <button
          type="button"
          onClick={() => handleNavigateTo('settings')}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 transition-all hover:bg-slate-200/50"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Settings</span>
        </button>
      </div>

      {/* DIGITAL STUDENT LIBRARY CARD */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-800 p-4 text-white border border-blue-400/50 mb-4">
        {/* Card Background Accents */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -left-6 -bottom-6 h-28 w-28 rounded-full bg-indigo-500/20 blur-lg pointer-events-none" />

        {/* Card Header */}
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/15">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20 backdrop-blur-sm">
              <Book className="h-3.5 w-3.5 text-white" />
            </span>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-blue-200">
                Libralink Pass
              </p>
              <p className="text-[11px] font-medium text-blue-100/90 leading-none">
                Digital Student ID
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Good Standing
          </span>
        </div>

        {/* Card Main Info */}
        <div className="relative z-10 my-4 flex items-center gap-3.5">
          {/* Avatar with quick photo upload */}
          <div className="relative shrink-0 group">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-2 border-white/60 bg-gradient-to-br from-blue-500 to-indigo-600">
              {profilePreview && !imageError ? (
                <img
                  src={profilePreview}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  onError={() => {
                    const uId = user?.user_id || user?.id;
                    const cached = uId ? localStorage.getItem(`libralink_avatar_${uId}`) : null;
                    if (cached && profilePreview !== cached) {
                      setProfilePreview(cached);
                    } else {
                      setImageError(true);
                    }
                  }}
                />
              ) : (
                <span className="text-xl font-bold tracking-wide text-white">
                  {initials}
                </span>
              )}
            </div>

            {/* Photo upload camera trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              title="Change profile picture"
              className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-blue-700 transition-transform hover:scale-110 active:scale-95 border border-slate-300"
            >
              {uploadingPhoto ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Camera className="h-3 w-3" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold tracking-tight text-white">
              {displayName}
            </h3>
            <p className="mt-0.5 text-xs font-mono font-semibold tracking-wider text-blue-200">
              ID: {studentNumber}
            </p>
            <p className="mt-1 truncate text-[11px] text-blue-100/80 flex items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{schoolName}</span>
            </p>
          </div>
        </div>

        {/* Card Barcode Accent */}
        <div className="relative z-10 mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Barcode className="h-5 w-16 text-white/75" />
            <span className="font-mono text-[10px] text-blue-100 tracking-wider font-semibold">
              {studentNumber}
            </span>
          </div>
          <span className="text-[10px] text-white/60 font-medium">Valid 2025–2026</span>
        </div>
      </div>

      {/* LIVE LIBRARY QUOTAS */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center">
          <p className="text-[10px] font-medium text-slate-500">Active Loans</p>
          <p className="mt-0.5 text-sm font-bold text-blue-600">
            {libraryStats.activeLoans}{" "}
            <span className="text-[10px] font-normal text-slate-400">
              / {libraryStats.maxLoans}
            </span>
          </p>
          <p className="text-[9px] text-slate-400 mt-0.5">Borrowed</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center">
          <p className="text-[10px] font-medium text-slate-500">Requests</p>
          <p className="mt-0.5 text-sm font-bold text-amber-600">
            {libraryStats.pendingRequests}
          </p>
          <p className="text-[9px] text-slate-400 mt-0.5">Pending</p>
        </div>
        <button
          type="button"
          onClick={() => setShowFinesInfo(true)}
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-center transition-all hover:border-blue-300 hover:bg-blue-50/30 active:scale-95 flex flex-col items-center justify-center"
        >
          <p className="text-[10px] font-medium text-slate-500 flex items-center justify-center gap-1">
            Fines Due
            <Info className="h-3 w-3 text-slate-400" />
          </p>
          <p className="mt-0.5 text-sm font-bold text-emerald-600">
            {libraryStats.fines}
          </p>
          <p className="text-[9px] text-slate-400 mt-0.5">Cleared</p>
        </button>
      </div>

      {/* QUICK LIBRARY SHORTCUTS */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => handleNavigateTo('history')}
          className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all text-xs font-semibold"
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            Borrow History
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        </button>
        <button
          type="button"
          onClick={() => handleNavigateTo('favorites')}
          className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all text-xs font-semibold"
        >
          <span className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500 fill-rose-50" />
            Favorites
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>

      {/* PERSONAL RECORDS / IN-PLACE EDITING */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Student Records
            </h4>
            <p className="text-[11px] text-slate-500">Official library membership details</p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              isEditing
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            {isEditing ? (
              <>
                <X className="h-3.5 w-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </>
            )}
          </button>
        </div>

        {isEditing ? (
          /* EDIT FORM */
          <form onSubmit={handleSaveProfile} className="mt-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Student ID Number
              </label>
              <input
                type="text"
                value={editForm.studentNumber}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, studentNumber: e.target.value }))
                }
                placeholder="e.g. 2024-00123"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={editForm.contactNumber}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, contactNumber: e.target.value }))
                }
                placeholder="09123456789"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Campus / College
              </label>
              <input
                type="text"
                value={editForm.schoolName}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, schoolName: e.target.value }))
                }
                placeholder="e.g. College of Science"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {savingProfile ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          /* VIEW RECORDS */
          <div className="divide-y divide-slate-100 text-xs">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Full Name
              </span>
              <span className="font-semibold text-slate-800 text-right truncate max-w-[180px]">
                {displayName}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                Email
              </span>
              <span className="font-medium text-slate-700 text-right truncate max-w-[180px]">
                {user?.email || 'Not provided'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                Contact
              </span>
              <span className="font-medium text-slate-700 text-right">
                {user?.contact_number || 'Not provided'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                Student #
              </span>
              <span className="font-mono font-semibold text-slate-800 text-right">
                {studentNumber}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                Campus
              </span>
              <span className="font-semibold text-blue-700 text-right truncate max-w-[180px]">
                {schoolName}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Fines Info */}
      {showFinesInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowFinesInfo(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-xs rounded-2xl bg-white p-5 border border-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Library Fines Policy</h4>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Ang iyong account ay kasalukuyang <strong>Cleared (₱0.00)</strong>.
            </p>
            <div className="mt-2.5 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 space-y-1.5">
              <p>• <strong>Overdue penalty:</strong> ₱5.00 bawat araw kada librong lumagpas sa return deadline.</p>
              <p>• <strong>Pagsasauli:</strong> Isauli ang libro sa o bago ang Due Date para maiwasan ang multa.</p>
              <p>• <strong>Settlement:</strong> Maaaring bayaran ang overdue fine sa mismong Library Circulation Counter.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowFinesInfo(false)}
              className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
            >
              Naintindihan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentProfile;
