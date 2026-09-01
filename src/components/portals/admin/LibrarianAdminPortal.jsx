import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiHome, FiMail, FiLogOut, FiBook, FiMoon, FiSun, FiUsers, FiList, FiCheckCircle, FiDollarSign, FiSettings, FiActivity, FiChevronDown, FiUser, FiLock, FiGrid, FiAlertOctagon, FiAlertTriangle } from "react-icons/fi";
import { getAdminNotifications, getBackendAssetUrl, signOut } from "../../../utils/api";
import api from "../../../utils/api";
import { AlertOverlay, ConfirmationOverlay, GlobalHeader } from "../../common";
import { LibrarianAdminDashboard, LibrarianAdminAddLibrarian, LibrarianAdminBooks, LibrarianAdminFines, LibrarianAdminActivityLog, LibrarianAdminInbox, LibrarianAdminSettings, LibrarianAdminProfile, LibrarianAdminChangePassword, LibrarianAdminReportedOverdue } from "../../collegeTabs/LibrarianAdminTabs";
import { LibrarianOverdueBooks } from "../../collegeTabs/LibrarianTabs";

const PesoIcon = ({ className }) => (
  <span className={className}>₱</span>
);

function LibrarianAdminPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [schoolLogoError, setSchoolLogoError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

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

  const sidebarItems = [
    { id: 'home', label: 'Dashboard', icon: FiHome },
    { id: 'books', label: 'Books Management', icon: FiBook },
    { id: 'users', label: 'Users Management', icon: FiUsers },
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
    { id: 'home', label: 'Dashboard', icon: FiHome },
    { id: 'books', label: 'Books', icon: FiBook },
    { id: 'users', label: 'Users', icon: FiUsers },
    { id: 'inbox', label: 'Inbox', icon: FiMail },
    { id: 'logout', label: 'Logout', icon: FiLogOut },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <LibrarianAdminDashboard />;
      case 'books':
        return <LibrarianAdminBooks />;
      case 'users':
        return <LibrarianAdminAddLibrarian />;
      case 'reported-overdue':
        return <LibrarianAdminReportedOverdue darkMode={darkMode} schoolId={localStorage.getItem('schoolId')} />;
      case 'fines':
        return <LibrarianAdminFines />;
      case 'activity':
        return <LibrarianAdminActivityLog />;
      case 'inbox':
        return <LibrarianAdminInbox />;
      case 'Library-Settings':
        return <LibrarianAdminSettings />;
      case 'profile':
        return <LibrarianAdminProfile />;
      case 'change-password':
        return <LibrarianAdminChangePassword />;
      case 'logout':
        handleLogout();
        return null;
      default:
        return <LibrarianAdminDashboard />;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 hidden lg:block">
          <div className="flex flex-col h-full">
            {/* Libralink System Branding */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <img src="/L.png" alt="Libralink Logo" className="w-9 h-9 rounded-lg object-cover" />
                <div>
                  <span className="text-lg font-semibold text-gray-900">LibraLink</span>
                  <p className="text-xs text-gray-500 mt-0.5">Administrator</p>
                </div>
              </div>
            </div>

            {/* Current School Info */}
            {schoolInfo && (
              <div className="px-4 py-4 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Current School</p>
                <div className="flex items-center gap-3">
                  {schoolInfo.logo && !schoolLogoError ? (
                    <img 
                      src={getBackendAssetUrl(schoolInfo.logo)} 
                      alt={`${schoolInfo.school_name} Logo`} 
                      className="w-10 h-10 rounded-lg object-contain bg-gray-50"
                      onError={() => {
                        console.error('School logo failed to load:', schoolInfo.logo, 'resolved URL:', getBackendAssetUrl(schoolInfo.logo));
                        setSchoolLogoError(true);
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <FiGrid className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{schoolInfo.school_name}</div>
                    <div className="text-xs text-gray-500">{schoolInfo.school_code}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-3">
              <nav className="space-y-1">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 group relative ${
                      activeTab === item.id
                        ? 'text-gray-900 font-semibold bg-slate-50 border-l-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                      {item.id === 'inbox' && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}

                {/* Settings Dropdown */}
                <div className="mt-4">
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md transition-all duration-150 group ${
                      settingsOpen || activeTab === 'Library-Settings' || activeTab === 'profile' || activeTab === 'change-password'
                        ? 'text-gray-900 font-semibold bg-slate-50 border-l-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FiSettings className={`w-5 h-5 ${settingsOpen || activeTab === 'Library-Settings' || activeTab === 'profile' || activeTab === 'change-password' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                      <span className="text-sm">Settings</span>
                    </div>
                    <FiChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Settings Submenu */}
                  <div className={`ml-8 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${settingsOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                    {settingsSubItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => {
                          setActiveTab(subItem.id);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 group ${
                          activeTab === subItem.id
                            ? 'text-gray-900 font-semibold bg-slate-50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'
                        }`}
                      >
                        <subItem.icon className={`w-4 h-4 ${activeTab === subItem.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        <span className="text-sm">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </nav>
            </div>

            {/* Bottom Section */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-red-600 hover:bg-red-50 transition-all duration-150"
              >
                <FiLogOut className="w-5 h-5" />
                <span className="text-sm">Logout</span>
              </button>
              <div className="text-xs text-gray-500 text-center mt-4">
                Libralink Library Management
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          {/* Global Header */}
          <GlobalHeader
            userName={userInfo?.firstname || userInfo?.name || 'Admin'}
            userRole={localStorage.getItem('userRole')}
            profileImage={userInfo?.profile_picture}
            unreadCount={unreadCount}
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onProfileClick={handleProfileClick}
            onSettingsClick={handleSettingsClick}
            onLogout={handleLogout}
            onDeleteNotification={handleDeleteNotification}
            onDeleteAllNotifications={handleDeleteAllNotifications}
            darkMode={darkMode}
          />

          {/* Top Bar - Mobile */}
          <div className={`lg:hidden sticky top-0 z-40 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/L.png" alt="Libralink Logo" className="w-8 h-8 rounded-lg" />
                <span className="font-bold text-gray-900 dark:text-white">LibraLink</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <FiLogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
            {schoolInfo && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                {schoolInfo.logo && !schoolLogoError ? (
                  <img 
                    src={getBackendAssetUrl(schoolInfo.logo)} 
                    alt={`${schoolInfo.school_name} Logo`} 
                    className="w-6 h-6 rounded object-contain bg-gray-50"
                    onError={() => {
                      console.error('School logo failed to load:', schoolInfo.logo, 'resolved URL:', getBackendAssetUrl(schoolInfo.logo));
                      setSchoolLogoError(true);
                    }}
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                    <FiGrid className="w-3 h-3 text-gray-400" />
                  </div>
                )}
                <span className="text-xs text-gray-500">{schoolInfo.school_name}</span>
              </div>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className={`lg:hidden fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t z-50`}>
            <div className="flex justify-around py-2">
              {mobileNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                    activeTab === item.id
                      ? 'text-blue-500'
                      : darkMode
                      ? 'text-gray-400'
                      : 'text-gray-600'
                  }`}
                >
                  <div className="relative">
                    <item.icon className="w-5 h-5" />
                    {item.id === 'inbox' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Page Content */}
          <div className="p-6 lg:p-8 pb-24 lg:pb-8">
            {renderContent()}
          </div>
        </main>
      </div>

      <ConfirmationOverlay
        show={showLogoutConfirmation}
        title="Confirm Logout"
        message="Are you sure you want to log out? You will be returned to the login page."
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirmation(false)}
      />
    </div>
  );
}

export default LibrarianAdminPortal;