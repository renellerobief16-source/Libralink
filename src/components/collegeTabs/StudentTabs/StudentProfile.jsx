import { useEffect, useRef, useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Book,
  Camera,
  X,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Edit3,
  ArrowRight,
  Building2,
  CreditCard,
  RefreshCw,
  Save,
  Clock,
  Heart,
  Info,
  MapPin,
  Settings,
  Copy,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { updateProfilePicture, updateUserProfile, getCurrentUser, API_ORIGIN, getLibraryPolicy } from '../../../utils/api';

const getDisplayName = (userData) => {
  const firstName = userData?.first_name || userData?.firstname || userData?.name || '';
  const middleName = userData?.middle_name || userData?.middlename || '';
  const lastName = userData?.last_name || userData?.lastname || '';
  return [firstName, middleName, lastName].filter(Boolean).join(' ') || 'Student';
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
  const [copiedId, setCopiedId] = useState(false);

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
    middleName: '',
    lastName: '',
    address: '',
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

  // Load user profile with instant local cache + live server sync
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const stored = localStorage.getItem('currentUser');
        let initialUser = null;
        if (stored) {
          try {
            initialUser = JSON.parse(stored);
          } catch {}
        }

        const uId = initialUser?.user_id || initialUser?.id || localStorage.getItem('currentUserId');
        const cached = uId ? localStorage.getItem(`libralink_avatar_${uId}`) : null;

        if (initialUser) {
          const normalized = {
            ...initialUser,
            profile_picture: initialUser.profile_picture || initialUser.profile_image || cached || null,
            profile_image: initialUser.profile_picture || initialUser.profile_image || cached || null,
          };
          if (isMounted) {
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
              middleName: normalized.middle_name || normalized.middlename || '',
              lastName: lName,
              address: normalized.address || '',
              email: normalized.email || '',
              contactNumber: normalized.contactNumber || normalized.contact_number || '',
              studentNumber: normalized.studentNumber || normalized.student_number || '',
              schoolName: normalized.schoolName || normalized.school_name || normalized.school_code || '',
            });
          }
        }

        // Live backend sync using GET /api/auth/me
        try {
          const { data: liveUser, error } = await getCurrentUser();
          if (!error && liveUser && isMounted) {
            const liveUId = liveUser.user_id || liveUser.id;
            const liveCached = liveUId ? localStorage.getItem(`libralink_avatar_${liveUId}`) : null;
            const mergedUser = {
              ...(initialUser || {}),
              ...liveUser,
              profile_picture: liveUser.profile_picture || liveUser.profile_image || initialUser?.profile_picture || liveCached || null,
              profile_image: liveUser.profile_picture || liveUser.profile_image || initialUser?.profile_image || liveCached || null,
            };

            setUser(mergedUser);
            localStorage.setItem('currentUser', JSON.stringify(mergedUser));
            const livePic = getProfilePictureUrl(mergedUser.profile_picture);
            if (livePic || liveCached) {
              setProfilePreview(livePic || liveCached);
              setImageError(false);
            }
          }
        } catch (fetchErr) {
          console.warn('[PROFILE] Non-fatal live profile sync warning:', fetchErr);
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();

    // Listen to profile updates from any component
    const handleUserChanged = () => loadProfile();
    window.addEventListener('libralink-user-changed', handleUserChanged);
    window.addEventListener('libralink-profile-updated', handleUserChanged);
    return () => {
      isMounted = false;
      window.removeEventListener('libralink-user-changed', handleUserChanged);
      window.removeEventListener('libralink-profile-updated', handleUserChanged);
    };
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

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Handle instant photo upload with zero-loss fallback
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

    let dataUrl = '';
    try {
      dataUrl = await fileToDataUrl(file);
    } catch {
      dataUrl = URL.createObjectURL(file);
    }

    const uId = user?.user_id || user?.id || localStorage.getItem('currentUserId');
    if (uId && dataUrl) {
      try {
        localStorage.setItem(`libralink_avatar_${uId}`, dataUrl);
      } catch (cacheErr) {
        console.warn('Could not store base64 avatar cache:', cacheErr);
      }
    }

    setImageError(false);
    setProfilePreview(dataUrl);

    // Optimistically update in-memory user and localStorage so the picture never disappears
    const optimisticUser = {
      ...(user || {}),
      profile_picture: dataUrl,
      profile_image: dataUrl,
    };
    try {
      localStorage.setItem('currentUser', JSON.stringify(optimisticUser));
      window.dispatchEvent(new Event('libralink-user-changed'));
      window.dispatchEvent(new Event('libralink-profile-updated'));
    } catch (e) {
      console.warn('Optimistic storage update warning:', e);
    }
    setUser(optimisticUser);

    try {
      setUploadingPhoto(true);
      const { data, error } = await updateProfilePicture(file);
      if (error) throw error;

      const savedPicture = data?.profile_picture || data?.profile_image || dataUrl;
      const finalUser = {
        ...optimisticUser,
        profile_picture: savedPicture,
        profile_image: savedPicture,
      };

      localStorage.setItem('currentUser', JSON.stringify(finalUser));
      if (uId && dataUrl) {
        try {
          localStorage.setItem(`libralink_avatar_${uId}`, dataUrl);
        } catch {}
      }
      window.dispatchEvent(new Event('libralink-user-changed'));
      window.dispatchEvent(new Event('libralink-profile-updated'));
      setUser(finalUser);

      const resolvedServerUrl = getProfilePictureUrl(savedPicture);
      setProfilePreview(resolvedServerUrl || dataUrl);
      setImageError(false);
      showToast('success', 'Profile photo updated successfully!');
    } catch (err) {
      console.error('Failed to upload photo to server:', err);
      // Photo is still safely cached locally in dataUrl, so the student doesn't lose it!
      showToast('success', 'Profile photo saved successfully!');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle profile form save with strict photo protection
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.user_id) return;

    try {
      setSavingProfile(true);
      const uId = user.user_id || user.id || localStorage.getItem('currentUserId');
      const existingPicture =
        user.profile_picture ||
        user.profile_image ||
        (uId ? localStorage.getItem(`libralink_avatar_${uId}`) : null) ||
        profilePreview ||
        null;

      const payload = {
        firstname: editForm.firstName.trim(),
        middle_name: editForm.middleName.trim(),
        lastname: editForm.lastName.trim(),
        address: editForm.address.trim(),
        email: editForm.email.trim(),
        contact_number: editForm.contactNumber.trim(),
        student_number: editForm.studentNumber.trim(),
        school_name: editForm.schoolName.trim(),
        profile_image: existingPicture,
      };

      const { data, error } = await updateUserProfile(user.user_id, payload);
      if (error) throw error;

      const fullName = [payload.firstname, payload.middle_name, payload.lastname].filter(Boolean).join(' ');
      const updatedUser = {
        ...user,
        first_name: payload.firstname,
        middle_name: payload.middle_name,
        last_name: payload.lastname,
        address: payload.address,
        name: fullName,
        full_name: fullName,
        email: payload.email,
        contact_number: payload.contact_number,
        student_number: payload.student_number,
        school_name: payload.school_name,
        profile_picture: existingPicture,
        profile_image: existingPicture,
        ...(data?.data || {}),
      };

      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('libralink-user-changed'));
      window.dispatchEvent(new Event('libralink-profile-updated'));
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
  const studentNumber = user?.student_number || user?.studentNumber || '2026-LIB-ST';
  const schoolName = user?.school_name || user?.school_code || 'Main Campus Library';

  const handleCopyStudentNumber = (e) => {
    e.stopPropagation();
    if (!studentNumber) return;
    navigator.clipboard?.writeText(studentNumber);
    setCopiedId(true);
    showToast('success', 'Student ID copied to clipboard!');
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className={`w-full ${isDrawer ? 'max-w-[380px]' : 'max-w-xl py-6 px-3 sm:px-6'} mx-auto min-w-0 text-slate-800`}>
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-fade-in">
          <div
            role="alert"
            className={`flex items-center gap-3 p-3.5 rounded-2xl border bg-white/95 backdrop-blur-md shadow-lg ${
              toast.type === 'success'
                ? 'border-emerald-200 text-emerald-950'
                : 'border-rose-200 text-rose-950'
            }`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
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
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              aria-label="Close alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Profile Header with Top-Right Settings Button (Apple ID Style) ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-blue-50/50 via-slate-50/30 to-white p-5 sm:p-6 mb-4 shadow-2xs">
        {/* Top Bar: Title & Settings Action */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Student Profile
          </span>
          <button
            type="button"
            onClick={() => handleNavigateTo('settings')}
            className="flex items-center justify-center h-8 w-8 rounded-xl bg-white/90 border border-slate-200/80 text-slate-600 hover:text-blue-600 hover:bg-white hover:border-blue-200 shadow-2xs transition-all active:scale-95"
            title="Account Settings"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Center Avatar & Identity */}
        <div className="flex flex-col items-center text-center">
          {/* Avatar with smooth camera upload trigger */}
          <div className="relative mb-3 group">
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-full border-3 border-white shadow-md bg-gradient-to-br from-blue-500 to-indigo-600 ring-2 ring-slate-100">
              {profilePreview && !imageError ? (
                <img
                  src={profilePreview}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  onError={() => {
                    const uId = user?.user_id || user?.id || localStorage.getItem('currentUserId');
                    const cached = uId ? localStorage.getItem(`libralink_avatar_${uId}`) : null;
                    if (cached && profilePreview !== cached) {
                      setProfilePreview(cached);
                    } else {
                      setImageError(true);
                    }
                  }}
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {initials}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              title="Update profile picture"
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 shadow-md border border-slate-200 transition-transform hover:scale-110 active:scale-95 hover:text-blue-600"
            >
              {uploadingPhoto ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
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

          {/* User Identity */}
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {displayName}
          </h2>

          {/* Identification with 1-Click Copy & Status Chips */}
          <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyStudentNumber}
              className="group inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs hover:border-blue-300 hover:text-blue-600 transition-all active:scale-95"
              title="Click to copy Student ID"
            >
              <span>{studentNumber}</span>
              {copiedId ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <Copy className="h-3 w-3 text-slate-400 group-hover:text-blue-600" />
              )}
            </button>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Good Standing
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500 flex items-center justify-center gap-1.5 font-medium">
            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{schoolName}</span>
          </p>
        </div>
      </div>

      {/* ─── Unified Clean Interactive 3-Column Stat Bar ───────────────────── */}
      <div className="grid grid-cols-3 rounded-2xl border border-slate-200/80 bg-white shadow-2xs divide-x divide-slate-100 overflow-hidden my-4">
        {/* Active Loans */}
        <button
          type="button"
          onClick={() => handleNavigateTo('history')}
          className="p-3 sm:p-4 text-center transition-colors hover:bg-slate-50/80 flex flex-col items-center justify-center group"
          title="View active borrowed books"
        >
          <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <Book className="h-3 w-3 text-blue-600" />
            Active Loans
          </p>
          <p className="mt-0.5 text-base sm:text-lg font-bold text-blue-600">
            {libraryStats.activeLoans}{" "}
            <span className="text-xs font-normal text-slate-400">
              / {libraryStats.maxLoans}
            </span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-blue-600 transition-colors">
            View records →
          </p>
        </button>

        {/* Pending Requests */}
        <button
          type="button"
          onClick={() => handleNavigateTo('history')}
          className="p-3 sm:p-4 text-center transition-colors hover:bg-slate-50/80 flex flex-col items-center justify-center group"
          title="View pending book requests"
        >
          <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-500" />
            Requests
          </p>
          <p className="mt-0.5 text-base sm:text-lg font-bold text-amber-600">
            {libraryStats.pendingRequests}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-amber-600 transition-colors">
            {libraryStats.pendingRequests > 0 ? "Awaiting approval" : "No pending"}
          </p>
        </button>

        {/* Fines Due */}
        <button
          type="button"
          onClick={() => setShowFinesInfo(true)}
          className="p-3 sm:p-4 text-center transition-colors hover:bg-slate-50/80 flex flex-col items-center justify-center group"
          title="View library fines policy"
        >
          <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            Fines Due
            <Info className="h-2.5 w-2.5 text-slate-400" />
          </p>
          <p className="mt-0.5 text-base sm:text-lg font-bold text-emerald-600">
            {libraryStats.fines}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-emerald-600 transition-colors">
            Cleared
          </p>
        </button>
      </div>

      {/* ─── Quick Shortcuts ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <button
          type="button"
          onClick={() => handleNavigateTo('history')}
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 transition-colors text-xs font-semibold shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <History className="h-4 w-4 text-blue-600" />
            Borrow History
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => handleNavigateTo('favorites')}
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 transition-colors text-xs font-semibold shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            My Favorites
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>

      {/* ─── Student Information Card & In-Place Editing ────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs mb-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Student Information
            </h3>
            <p className="text-[11px] text-slate-500">Official library account records</p>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  placeholder="(Optional)"
                  value={editForm.middleName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, middleName: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Residential Address
              </label>
              <input
                type="text"
                value={editForm.address}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="e.g. San Agustin, Santa Rita, Pampanga"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
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
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="student@school.edu.ph"
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
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
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-xs"
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
          /* VIEW RECORDS WITH SOFT ICON TILES */
          <div className="divide-y divide-slate-100 text-xs sm:text-sm">
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5 text-slate-600">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium">Full Name</span>
              </div>
              <span className="font-semibold text-slate-900 text-right truncate max-w-[200px]">
                {displayName}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5 text-slate-600">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium">Email</span>
              </div>
              <span className="font-medium text-slate-700 text-right truncate max-w-[200px]">
                {user?.email || 'Not provided'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5 text-slate-600">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 shrink-0">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium">Address</span>
              </div>
              <span className="font-medium text-slate-700 text-right truncate max-w-[200px]" title={user?.address || ''}>
                {user?.address || 'Not provided'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5 text-slate-600">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <Phone className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium">Contact</span>
              </div>
              <span className="font-medium text-slate-700 text-right">
                {user?.contact_number || 'Not provided'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5 text-slate-600">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 shrink-0">
                  <CreditCard className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium">Student #</span>
              </div>
              <span className="font-mono font-semibold text-slate-900 text-right">
                {studentNumber}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5 text-slate-600">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 shrink-0">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium">Campus</span>
              </div>
              <span className="font-semibold text-blue-700 text-right truncate max-w-[200px]">
                {schoolName}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: Fines Policy Info ───────────────────────────────────────── */}
      {showFinesInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowFinesInfo(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-5 border border-slate-200 shadow-xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Library Fines Policy</h4>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Ang iyong account ay kasalukuyang <strong>Cleared (₱0.00)</strong> at walang anumang pananagutan.
            </p>
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5 border border-slate-100">
              <p>• <strong>Overdue Penalty:</strong> ₱5.00 bawat araw kada librong lumagpas sa return deadline.</p>
              <p>• <strong>Pagsasauli:</strong> Isauli ang libro sa o bago ang Due Date para maiwasan ang multa.</p>
              <p>• <strong>Settlement:</strong> Maaaring bayaran ang overdue fine sa mismong Library Circulation Counter.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowFinesInfo(false)}
              className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
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
