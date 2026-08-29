import { useState, useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { signOut, updateProfilePicture, updateUserProfile } from '../../../utils/api';
import api from '../../../utils/api';
import { ConfirmationOverlay } from '../../common';
import { useNotifications } from '../../../context/NotificationContext';
import {
  StudentHome,
  StudentSearch,
  StudentFavorite,
  StudentInbox,
  StudentHistory,
  StudentSettings,
  StudentProfile,
  StudentChangePassword,
  StudentAbout,
  StudentHelp,
  StudentTermsOfService,
  StudentPrivacyPolicy,
  StudentLayout,
} from '../../collegeTabs/StudentTabs';

const requestDesktopFullscreen = () => {
  const docEl = document.documentElement;
  const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;

  if (typeof requestFS === 'function') {
    requestFS.call(docEl);
  }
};

const exitDesktopFullscreen = () => {
  try {
    const doc = document;
    const exitFS = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;

    if (typeof exitFS === 'function') {
      exitFS.call(doc);
    }
  } catch (error) {
    // Ignore fullscreen exit errors (document not active, etc.)
    console.warn('Fullscreen exit error (ignored):', error);
  }
};

function StudentPortal() {
  const navigate = useNavigate();
  let unreadCount = 0;
  try {
    const notificationContext = useNotifications();
    unreadCount = notificationContext.unreadCount || 0;
  } catch (error) {
    console.warn('Notification context not available:', error.message);
  }
  const [bookCount, setBookCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [schoolLogoError, setSchoolLogoError] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileSetupForm, setProfileSetupForm] = useState({
    username: '',
    cellphone: '',
    recoveryEmail: '',
    policyAccepted: false,
  });
  const [profileSetupPhoto, setProfileSetupPhoto] = useState(null);
  const [profileSetupPreview, setProfileSetupPreview] = useState('');
  const [profileSetupLoading, setProfileSetupLoading] = useState(false);

  useEffect(() => {
    const userCollege = localStorage.getItem('userCollege');
    const userRole = localStorage.getItem('userRole');
    const schoolId = localStorage.getItem('schoolId');

    if (userRole !== 'student' || !schoolId) {
      navigate('/login');
      return;
    }

    // Fetch school information
    const fetchSchoolInfo = async () => {
      try {
        console.log('Fetching school info for schoolId:', schoolId);
        const response = await api.get(`/schools/${schoolId}`);
        const schoolData = response?.data || response;
        console.log('School info response:', response);
        console.log('School logo:', schoolData?.logo);
        setSchoolInfo(schoolData);
      } catch (error) {
        console.error('Error fetching school info:', error);
      }
    };

    // Load user information
    const loadUserInfo = () => {
      try {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
          const userData = JSON.parse(userStr);
          setUserInfo(userData);
          const hasUsername = !!(userData.username || userData.name || userData.first_name);
          const hasCellphone = !!userData.contact_number;
          const hasRecoveryEmail = !!userData.recovery_email;
          const hasProfilePicture = !!(userData.profile_picture || userData.profile_image);
          const hasPolicyAccepted = !!userData.policy_accepted;

          setProfileSetupForm({
            username: userData.username || userData.name || userData.first_name || '',
            cellphone: userData.contact_number || '',
            recoveryEmail: userData.recovery_email || userData.email || '',
            policyAccepted: hasPolicyAccepted,
          });

          setShowProfileSetup(!hasUsername || !hasCellphone || !hasRecoveryEmail || !hasProfilePicture || !hasPolicyAccepted);
        }
      } catch (err) {
        console.error('Error loading user info:', err);
      }
    };

    fetchSchoolInfo();
    loadUserInfo();
  }, [navigate]);

  useEffect(() => {
    setSchoolLogoError(false);
  }, [schoolInfo?.logo]);

  useEffect(() => {
    const loadCounts = async () => {
      const schoolId = localStorage.getItem('schoolId');
      if (!schoolId) return;

      try {
        // Fetch books for this school
        const booksResponse = await api.get(`/books/school?school_id=${schoolId}`);
        if (booksResponse.data) {
          setBookCount(booksResponse.data.length);
        }

        // Count students for this school
        const studentsResponse = await api.get(`/users/school/${schoolId}`);
        const studentCount = studentsResponse.data?.filter(u => u.role_id === 3).length || 0;
        setStudentCount(studentCount);
      } catch (err) {
        console.error('Unable to load student counts:', err);
      }
    };

    loadCounts();
  }, []);

  const handleProfileSetupPhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProfileSetupPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setProfileSetupPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleProfileSetupSubmit = async () => {
    if (!profileSetupForm.username.trim()) {
      alert('Please enter your username.');
      return;
    }

    if (!profileSetupForm.cellphone.trim()) {
      alert('Please enter your cellphone number.');
      return;
    }

    if (!profileSetupForm.recoveryEmail.trim()) {
      alert('Please enter your recovery email.');
      return;
    }

    if (!profileSetupPhoto && !(userInfo?.profile_picture || userInfo?.profile_image)) {
      alert('Please upload a profile picture.');
      return;
    }

    if (!profileSetupForm.policyAccepted) {
      alert('Please accept the policy before accessing the system.');
      return;
    }

    try {
      setProfileSetupLoading(true);

      let uploadedPicture = userInfo?.profile_picture || userInfo?.profile_image || '';
      if (profileSetupPhoto) {
        const { data, error } = await updateProfilePicture(profileSetupPhoto);
        if (error) throw error;
        uploadedPicture = data?.profile_picture || data?.profile_image || uploadedPicture;
      }

      const userId = userInfo?.user_id || userInfo?.id || Number(localStorage.getItem('currentUserId'));
      const cleanedEmail = profileSetupForm.recoveryEmail.trim();
      const payload = {
        username: profileSetupForm.username.trim(),
        contact_number: profileSetupForm.cellphone.trim(),
        recovery_email: cleanedEmail,
        profile_picture: uploadedPicture,
        profile_image: uploadedPicture,
        policy_accepted: true,
      };

      if (userId) {
        const { error } = await updateUserProfile(userId, payload);
        if (error) throw error;
      }

      const updatedUser = {
        ...userInfo,
        ...payload,
        profile_picture: uploadedPicture,
        profile_image: uploadedPicture,
        username: profileSetupForm.username.trim(),
        contact_number: profileSetupForm.cellphone.trim(),
        recovery_email: cleanedEmail,
        policy_accepted: true,
      };

      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setUserInfo(updatedUser);
      setShowProfileSetup(false);
      requestDesktopFullscreen();
      setProfileSetupPhoto(null);
      setProfileSetupPreview('');
    } catch (error) {
      console.error('Profile setup error:', error);
      alert(error.message || 'Unable to complete your profile setup. Please try again.');
    } finally {
      setProfileSetupLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirmation(true);
  };

  const confirmLogout = async () => {
    exitDesktopFullscreen();
    await signOut();
    setShowLogoutConfirmation(false);
    navigate('/login');
  };

  const schoolName = schoolInfo?.school_name || 'School';
  const schoolCode = schoolInfo?.school_code || '';

  const handleBookClick = (book) => {
    console.log('Book clicked:', book);
    // Handle book click - could open book details
  };

  const handleBorrowClick = (book) => {
    console.log('Borrow clicked for book:', book);
    // Handle borrow click - could open borrowing form
    // For now, add to borrowing list
    if (window.borrowingListRef?.current) {
      window.borrowingListRef.current.addToBorrowingList({
        book_id: book.id || book.book_id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        owner_school_id: book.school_id || parseInt(localStorage.getItem('schoolId')),
        owner_school_name: book.library || 'Your Library',
        borrow_type: 'HOME',
      });
    }
  };

  return (
    <>
      {showProfileSetup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-4xl min-w-[320px] md:min-w-[760px] lg:min-w-[820px] overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <div className="grid md:grid-cols-[0.9fr_1.1fr]">
              <div className="relative hidden min-h-[620px] bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 p-8 text-white md:flex md:flex-col md:justify-between">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.25),_transparent_38%)]" />
                <div className="relative z-10">
                  <div className="mb-7 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/10 shadow-lg backdrop-blur-sm">
                    <img src="/L.png" alt="Libralink Logo" className="h-full w-full rounded-full object-cover" />
                  </div>
                  <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">Welcome</p>
                  <h2 className="text-3xl font-bold leading-tight">Complete your student profile</h2>
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-sm font-medium text-blue-50">Before you access the system, we need a few details to keep your account secure.</p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-blue-950/20 p-4 text-sm text-blue-50">
                    Username, phone number, recovery email, profile picture, and policy agreement are required.
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 lg:p-8 md:min-h-[620px] md:max-w-[520px] md:justify-center md:flex md:flex-col">
                <div className="mb-6 text-center md:text-left">
                  <h3 className="text-2xl font-bold text-slate-900">Finish your setup</h3>
                  <p className="mt-1 text-sm text-slate-600">Please fill in the required details before entering the student portal.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Username</label>
                    <input
                      type="text"
                      value={profileSetupForm.username}
                      onChange={(e) => setProfileSetupForm({ ...profileSetupForm, username: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Enter username"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Cellphone No</label>
                    <input
                      type="tel"
                      value={profileSetupForm.cellphone}
                      onChange={(e) => setProfileSetupForm({ ...profileSetupForm, cellphone: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="09xxxxxxxxx"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Gmail Account to recover your password</label>
                    <input
                      type="email"
                      value={profileSetupForm.recoveryEmail}
                      onChange={(e) => setProfileSetupForm({ ...profileSetupForm, recoveryEmail: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="you@gmail.com"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Profile Picture</label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                        {profileSetupPreview || userInfo?.profile_picture || userInfo?.profile_image ? (
                          <img
                            src={profileSetupPreview || (userInfo?.profile_picture || userInfo?.profile_image)}
                            alt="Profile preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-bold text-slate-400">+</span>
                        )}
                      </div>
                      <label className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100">
                        Upload Photo
                        <input type="file" accept="image/*" className="hidden" onChange={handleProfileSetupPhotoChange} />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-800">Policy</p>
                    <div className="max-h-28 overflow-y-auto pr-1 text-xs leading-6 text-slate-600">
                      By using this system, you agree to keep your account information accurate, use the platform responsibly, protect your login credentials, and avoid any unauthorized or harmful activity. The library administration may monitor account usage for security and compliance purposes. Misuse of the system may result in restricted access or disciplinary action.
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={profileSetupForm.policyAccepted}
                        onChange={(e) => setProfileSetupForm({ ...profileSetupForm, policyAccepted: e.target.checked })}
                        className="h-4 w-4 accent-blue-600"
                      />
                      I agree to the policy
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleProfileSetupSubmit}
                    disabled={profileSetupLoading}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                  >
                    {profileSetupLoading ? 'Saving...' : 'IN'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <StudentLayout
        schoolInfo={schoolInfo}
        userInfo={userInfo}
        onLogout={handleLogout}
      >
        <Routes>
          <Route path="/" element={<StudentHome bookCount={bookCount} studentCount={studentCount} schoolInfo={schoolInfo} />} />
          <Route path="/search" element={<StudentSearch onBookClick={handleBookClick} onBorrowClick={handleBorrowClick} />} />
          <Route path="/favorites" element={<StudentFavorite />} />
          <Route path="/inbox" element={<StudentInbox />} />
          <Route path="/history" element={<StudentHistory />} />
          <Route path="/profile" element={<StudentProfile />} />
          <Route path="/change-password" element={<StudentChangePassword />} />
          <Route path="/settings" element={<StudentSettings />} />
          <Route path="/about" element={<StudentAbout />} />
          <Route path="/help" element={<StudentHelp />} />
          <Route path="/terms" element={<StudentTermsOfService />} />
          <Route path="/privacy" element={<StudentPrivacyPolicy />} />
        </Routes>
      </StudentLayout>

      <ConfirmationOverlay
        show={showLogoutConfirmation}
        title="Confirm Logout"
        message="Are you sure you want to log out? You will be returned to the login page."
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirmation(false)}
      />
    </>
  );
}

export default StudentPortal;
