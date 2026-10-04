import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiHome, FiMail, FiLogOut, FiBook, FiMoon, FiSun, FiUsers, FiList, FiCheckCircle, FiDollarSign, FiSettings, FiActivity, FiChevronDown, FiUser, FiLock, FiGrid, FiAlertOctagon, FiAlertTriangle, FiSliders, FiUserPlus, FiUploadCloud } from "react-icons/fi";
import { getAdminNotifications, getBackendAssetUrl, signOut } from "../../../utils/api";
import api from "../../../utils/api";
import { AlertOverlay, ConfirmationOverlay, GlobalHeader, LogoutConfirmationModal } from "../../common";
import GlobalCirculationScanner from "../../common/GlobalCirculationScanner";
import { LibrarianAdminDashboard, LibrarianAdminAddLibrarian, LibrarianAdminBooks, LibrarianAdminFines, LibrarianAdminActivityLog, LibrarianAdminInbox, LibrarianAdminSettings, LibrarianAdminProfile, LibrarianAdminChangePassword, LibrarianAdminReportedOverdue, LibrarianAdminPolicies, LibrarianAdminLibraries } from "../../collegeTabs/LibrarianAdminTabs";
import { LibrarianOverdueBooks, LibrarianAddStudent, LibrarianListStudents, LibrarianBooksManagement as AdminBooksManagement } from "../../collegeTabs/LibrarianTabs";

const PesoIcon = ({ className }) => (
  <span className={className}>₱</span>
);

function LibrarianAdminPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    if (location.state?.tab) return location.state.tab;
    return typeof window !== "undefined" && window.innerWidth < 1024 ? 'students' : 'home';
  });
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [schoolLogoError, setSchoolLogoError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [books, setBooks] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState(() => {
    return localStorage.getItem('currentLibraryId') || 'all';
  });
  const [multiLibraryEnabled, setMultiLibraryEnabled] = useState(() => {
    const sId = localStorage.getItem('schoolId');
    return localStorage.getItem(`enable_multi_library_${sId}`) === 'true';
  });

  useEffect(() => {
    const handleMultiLibToggle = (e) => {
      const sId = localStorage.getItem('schoolId');
      if (e?.detail?.enabled !== undefined) {
        setMultiLibraryEnabled(e.detail.enabled);
      } else {
        setMultiLibraryEnabled(localStorage.getItem(`enable_multi_library_${sId}`) === 'true');
      }
    };
    window.addEventListener('libralink-multi-library-toggled', handleMultiLibToggle);
    return () => window.removeEventListener('libralink-multi-library-toggled', handleMultiLibToggle);
  }, []);

  // Sync activeTab when navigated with state (e.g. from Circulation Desk policy modal)
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  // Keep mobile view confined to the 3 permitted tabs: Registration, Directory, Catalog
  useEffect(() => {
    const handleMobileTabCheck = () => {
      if (window.innerWidth < 1024) {
        setActiveTab(prev => {
          if (!['students', 'list-students', 'books'].includes(prev)) {
            return 'students';
          }
          return prev;
        });
      }
    };
    handleMobileTabCheck();
    window.addEventListener('resize', handleMobileTabCheck);
    return () => window.removeEventListener('resize', handleMobileTabCheck);
  }, []);

  useEffect(() => {
    const userRole = (localStorage.getItem('userRole') || '').toLowerCase().trim();
    const roleId = localStorage.getItem('roleId');
    const schoolId = localStorage.getItem('schoolId');

    console.log('LibrarianAdminPortal - userRole:', userRole);
    console.log('LibrarianAdminPortal - roleId:', roleId);
    console.log('LibrarianAdminPortal - schoolId:', schoolId);

    // Check for admin-librarian role (role_id 2) or role name matching
    const isAdminLibrarian = roleId === '2' || 
                           userRole === 'admin-librarian' || 
                           userRole === 'admin_librarian' ||
                           userRole === 'librarian_admin' || 
                           userRole === 'librarian admin';

    if (!isAdminLibrarian || !schoolId) {
      console.log('Access denied - redirecting to login');
      navigate('/login');
      return;
    }

    // Fetch school information
    const fetchSchoolInfo = async () => {
      try {
        const response = await api.get(`/schools/${schoolId}`);
        console.log('School info response:', response.data);
        console.log('School logo path:', response.data?.logo);
        setSchoolInfo(response.data);
      } catch (error) {
        console.error('Error fetching school info:', error);
      }
    };

    fetchSchoolInfo();
  }, [navigate]);

  useEffect(() => {
    setSchoolLogoError(false);
  }, [schoolInfo?.logo]);

  useEffect(() => {
    const handleSchoolUpdate = (e) => {
      if (e.detail) {
        setSchoolInfo(e.detail);
        setSchoolLogoError(false);
      }
    };
    window.addEventListener('libralink-school-updated', handleSchoolUpdate);
    return () => window.removeEventListener('libralink-school-updated', handleSchoolUpdate);
  }, []);

  useEffect(() => {
    const handleProfileUpdate = (e) => {
      if (e.detail) {
        setUserInfo((prev) => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('libralink-profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('libralink-profile-updated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      const schoolId = localStorage.getItem('schoolId');
      if (!schoolId) return;

      try {
        // Fetch notifications
        const notificationsResponse = await getAdminNotifications(schoolId);
        if (notificationsResponse.data && Array.isArray(notificationsResponse.data)) {
          setNotifications(notificationsResponse.data);
          setUnreadCount(notificationsResponse.data.filter((n) => !n.read).length);
        }

        // Fetch books for GlobalHeader search shortcuts
        try {
          const booksRes = await api.get(`/books/school?school_id=${schoolId}&group=true`);
          const booksList = Array.isArray(booksRes.data) ? booksRes.data : (booksRes.data?.books || []);
          setBooks(booksList);
        } catch (bookErr) {
          console.error('Error fetching books for admin header:', bookErr);
        }

        // Fetch user info
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
          setUserInfo(JSON.parse(currentUser));
        }
      } catch (err) {
        console.error('Error loading admin stats:', err);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLibraries = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) return;
    try {
      const res = await api.get(`/libraries/school/${schoolId}`);
      const list = res.data?.data || res.data?.libraries || (Array.isArray(res.data) ? res.data : []);
      setLibraries(list);
    } catch (err) {
      console.error('Error fetching libraries:', err);
    }
  };

  useEffect(() => {
    fetchLibraries();
    const handleLibrariesUpdate = () => fetchLibraries();
    window.addEventListener('libralink-libraries-updated', handleLibrariesUpdate);
    return () => window.removeEventListener('libralink-libraries-updated', handleLibrariesUpdate);
  }, []);

  const handleLibraryChange = (newLibId) => {
    setSelectedLibraryId(newLibId);
    if (newLibId === 'all') {
      localStorage.removeItem('currentLibraryId');
    } else {
      localStorage.setItem('currentLibraryId', newLibId);
    }
    window.dispatchEvent(new CustomEvent('libralink-library-changed', { detail: newLibId }));
  };

  const handleLogout = () => {
    setShowLogoutConfirmation(true);
  };

  const confirmLogout = async () => {
    await signOut();
    setShowLogoutConfirmation(false);
    navigate('/login');
  };

  const handleNotificationClick = () => {
    setActiveTab('inbox');
  };

  const handleProfileClick = () => {
    setActiveTab('profile');
  };

  const handleSettingsClick = () => {
    alert('Settings feature coming soon');
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const schoolId = localStorage.getItem('schoolId');
      await api.delete(`/notifications/${notificationId}`);
      // Refresh notifications
      const notificationsResponse = await getAdminNotifications(schoolId);
      if (notificationsResponse.data && Array.isArray(notificationsResponse.data)) {
        setNotifications(notificationsResponse.data);
        setUnreadCount(notificationsResponse.data.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      await api.delete('/notifications/clear-all');
      // Refresh notifications
      const schoolId = localStorage.getItem('schoolId');
      const notificationsResponse = await getAdminNotifications(schoolId);
      if (notificationsResponse.data && Array.isArray(notificationsResponse.data)) {
        setNotifications(notificationsResponse.data);
        setUnreadCount(notificationsResponse.data.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const hasMultipleLibraries = libraries && libraries.length > 1;
  const showMultiLibrary = multiLibraryEnabled || hasMultipleLibraries;

  const sidebarItems = [
    { id: 'home', label: 'Dashboard', icon: FiHome },
    ...(showMultiLibrary ? [{ id: 'libraries', label: 'Libraries', icon: FiGrid }] : []),
    { id: 'books', label: 'Books Management', icon: FiBook },
    { id: 'books-management', label: 'Import Books', icon: FiUploadCloud },
    { id: 'users', label: 'Users Management', icon: FiUsers },
    { id: 'policies', label: 'Borrowing Policies', icon: FiSliders },
    { id: 'reported-overdue', label: 'Reported Overdue', icon: FiAlertTriangle },
    { id: 'fines', label: 'Fines Management', icon: PesoIcon },
    { id: 'activity', label: 'Activity Log', icon: FiActivity },
    { id: 'inbox', label: 'Inbox', icon: FiMail },
  ];

  const settingsSubItems = [
    { id: 'Library-Settings', label: 'Library Settings', icon: FiSettings },
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'change-password', label: 'Change Password', icon: FiLock },
  ];

  const mobileNavItems = [
    { id: 'students', label: 'Registration', icon: FiUserPlus },
    { id: 'list-students', label: 'Student Directory', icon: FiList },
    { id: 'books', label: 'Book Catalog', icon: FiBook },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <LibrarianAdminDashboard 
            onNavigate={setActiveTab} 
            selectedLibraryId={selectedLibraryId} 
            onSelectLibrary={handleLibraryChange}
            libraries={libraries}
          />
        );
      case 'libraries':
        return (
          <LibrarianAdminLibraries 
            selectedLibraryId={selectedLibraryId} 
            onSelectLibrary={handleLibraryChange} 
            onNavigateTab={setActiveTab}
            onLibrariesUpdated={fetchLibraries}
          />
        );
      case 'students':
        return <LibrarianAddStudent darkMode={darkMode} onNavigateTab={setActiveTab} selectedLibraryId={selectedLibraryId} />;
      case 'list-students':
        return <LibrarianListStudents darkMode={darkMode} selectedLibraryId={selectedLibraryId} />;
      case 'books':
        return <LibrarianAdminBooks selectedLibraryId={selectedLibraryId} libraries={libraries} onNavigateTab={setActiveTab} />;
      case 'books-management':
        return <AdminBooksManagement darkMode={darkMode} onNavigateTab={setActiveTab} selectedLibraryId={selectedLibraryId} />;
      case 'users':
        return <LibrarianAdminAddLibrarian selectedLibraryId={selectedLibraryId} libraries={libraries} onLibrariesUpdated={fetchLibraries} />;
      case 'reported-overdue':
        return <LibrarianAdminReportedOverdue darkMode={darkMode} schoolId={localStorage.getItem('schoolId')} selectedLibraryId={selectedLibraryId} />;
      case 'policies':
        return <LibrarianAdminPolicies />;
      case 'fines':
        return <LibrarianAdminFines selectedLibraryId={selectedLibraryId} />;
      case 'activity':
        return <LibrarianAdminActivityLog selectedLibraryId={selectedLibraryId} />;
      case 'inbox':
        return <LibrarianAdminInbox />;
      case 'Library-Settings':
        return <LibrarianAdminSettings onNavigate={setActiveTab} />;
      case 'profile':
        return <LibrarianAdminProfile onNavigate={setActiveTab} />;
      case 'change-password':
        return <LibrarianAdminChangePassword />;
      case 'logout':
        handleLogout();
        return null;
      default:
        return (
          <LibrarianAdminDashboard 
            onNavigate={setActiveTab} 
            selectedLibraryId={selectedLibraryId} 
            onSelectLibrary={handleLibraryChange}
            libraries={libraries}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex min-h-screen">
        {/* Sidebar - Desktop */}
        <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200/70 z-50 hidden lg:block">
          <div className="flex flex-col h-full">
            {/* Minimalist Seamless Brand & Campus Header */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {schoolInfo?.logo && !schoolLogoError ? (
                  <img 
                    src={getBackendAssetUrl(schoolInfo.logo)} 
                    alt="Campus Logo" 
                    className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200/80 p-0.5 shadow-2xs" 
                    onError={() => setSchoolLogoError(true)}
                  />
                ) : (
                  <img src="/L.png" alt="Libralink Logo" className="w-8 h-8 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">LibraLink</span>
                  {schoolInfo ? (
                    <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5" title={schoolInfo.school_name}>
                      {schoolInfo.school_name} {schoolInfo.school_code ? `• ${schoolInfo.school_code}` : ''}
                    </p>
                  ) : (
                    <p className="text-[11px] font-medium text-slate-400">Administrator</p>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-3 px-3 custom-scrollbar">
              <nav className="space-y-0.5">
                {sidebarItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-150 group cursor-pointer ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <item.icon className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.id === 'inbox' && unreadCount > 0 && (
                        <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-rose-500 text-white'
                        }`}>
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Settings Dropdown */}
                <div className="pt-2 mt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-150 group cursor-pointer ${
                      settingsOpen || activeTab === 'Library-Settings' || activeTab === 'profile' || activeTab === 'change-password'
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FiSettings className={`w-4 h-4 ${
                        settingsOpen || activeTab === 'Library-Settings' || activeTab === 'profile' || activeTab === 'change-password' 
                          ? 'text-blue-600' 
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`} />
                      <span>Settings</span>
                    </div>
                    <FiChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${settingsOpen ? 'rotate-180 text-slate-700' : ''}`} />
                  </button>

                  {/* Settings Submenu */}
                  <div className={`mt-1 space-y-0.5 pl-3 overflow-hidden transition-all duration-200 ${settingsOpen ? 'max-h-40 opacity-100 py-1' : 'max-h-0 opacity-0'}`}>
                    {settingsSubItems.map((subItem) => {
                      const isSubActive = activeTab === subItem.id;
                      return (
                        <button
                          key={subItem.id}
                          onClick={() => setActiveTab(subItem.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                            isSubActive
                              ? 'bg-blue-50 text-blue-600 font-semibold'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <subItem.icon className={`w-3.5 h-3.5 ${isSubActive ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="truncate">{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </nav>
            </div>

            {/* Bottom Section */}
            <div className="p-3 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50/70 transition-all duration-150 cursor-pointer group"
              >
                <FiLogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 lg:ml-64 pb-16 lg:pb-0">
          {/* Global Header */}
          <GlobalHeader
            userName={userInfo?.firstname || userInfo?.name || 'Admin'}
            userRole={localStorage.getItem('userRole')}
            profileImage={userInfo?.profile_picture || userInfo?.profile_image}
            unreadCount={unreadCount}
            notifications={notifications}
            schoolId={localStorage.getItem('schoolId')}
            schoolInfo={schoolInfo}
            books={books}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onToggleDarkMode={() => setDarkMode(prev => !prev)}
            onOpenStaffModal={() => setActiveTab('policies')}
            onNotificationClick={handleNotificationClick}
            onProfileClick={handleProfileClick}
            onSettingsClick={handleSettingsClick}
            onLogout={handleLogout}
            onDeleteNotification={handleDeleteNotification}
            onDeleteAllNotifications={handleDeleteAllNotifications}
            darkMode={darkMode}
          />

          {/* Library Scope Selector Bar for Admin (Only shown in Multi-Library Mode or when multiple units exist) */}
          {showMultiLibrary && (
            <div className={`${darkMode ? 'bg-slate-800/95 border-slate-700/80 text-white' : 'bg-white border-slate-200/80 text-slate-800'} border-b px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs sticky top-16 z-20`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                  <FiGrid className="w-4 h-4" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Library Scope:</span>
                  <div className="relative inline-block">
                    <select
                      value={selectedLibraryId}
                      onChange={(e) => handleLibraryChange(e.target.value)}
                      className={`text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 border appearance-none cursor-pointer transition-all ${
                        darkMode 
                          ? 'bg-slate-900 border-slate-700 text-slate-100 hover:border-blue-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-blue-500 focus:bg-white'
                      }`}
                    >
                      <option value="all">🏛️ All Libraries (Campus Overview)</option>
                      {libraries.map((lib, idx) => (
                        <option key={lib.library_id || lib.id || idx} value={lib.library_id || lib.id}>
                          {lib.library_type === 'college' ? '📚' : lib.library_type === 'senior_high_school' ? '🎓' : lib.library_type === 'junior_high_school' ? '🎒' : '📖'} {lib.name} {lib.status === 'inactive' ? '(Inactive)' : ''}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {selectedLibraryId !== 'all' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      Filtered View
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedLibraryId !== 'all' && (
                  <button
                    onClick={() => handleLibraryChange('all')}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    Reset to Campus All
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('libraries')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                >
                  <FiSliders className="w-3.5 h-3.5" />
                  <span>Manage Libraries {libraries.length > 0 ? `(${libraries.length})` : ''}</span>
                </button>
              </div>
            </div>
          )}

          {/* Mobile Navigation - Exactly 3 tabs */}
          <nav 
            aria-label="Mobile Navigation" 
            className={`lg:hidden fixed bottom-0 left-0 right-0 h-16 ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            } border-t z-50 flex items-center justify-around px-3 shadow-lg`}
          >
            {mobileNavItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-150 relative cursor-pointer ${
                    isActive
                      ? 'text-blue-600 font-bold'
                      : darkMode
                      ? 'text-slate-400 hover:text-slate-200 font-medium'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-0 w-8 h-1 bg-blue-600 rounded-full" />
                  )}
                  <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-110 text-blue-600' : ''}`} />
                  <span className="text-[11px] mt-1 tracking-tight truncate max-w-[100px] text-center">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Page Content */}
          <div className="p-4 sm:p-6 lg:p-8 min-w-0">
            {renderContent()}
          </div>
        </main>
      </div>

      <LogoutConfirmationModal
        show={showLogoutConfirmation}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirmation(false)}
        darkMode={darkMode}
        userInfo={userInfo}
        schoolInfo={schoolInfo}
      />

      {/* Global Instant Circulation Scanner (Anywhere / Any Tab) */}
      <GlobalCirculationScanner
        schoolId={schoolInfo?.school_id || localStorage.getItem('schoolId')}
        libraryId={selectedLibraryId}
        darkMode={darkMode}
      />
    </div>
  );
}

export default LibrarianAdminPortal;