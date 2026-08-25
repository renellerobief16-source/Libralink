import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiHome, FiMail, FiLogOut, FiBook, FiUsers, FiList, FiCheckCircle, FiMoon, FiSun, FiSettings, FiGlobe, FiShield, FiDatabase, FiMonitor, FiSmartphone } from "react-icons/fi";
import { getAdminNotifications, signOut } from "../../../utils/api";
import { AlertOverlay, ConfirmationOverlay, GlobalHeader } from "../../common";
import { SuperAdminDashboard, SuperAdminSchools, SuperAdminRoles, SuperAdminSettings, SuperAdminInbox, SuperAdminUsers, SuperAdminBooks, SuperAdminAnalytics } from "../../collegeTabs/SuperAdminTabs";

function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [systemSettingsExpanded, setSystemSettingsExpanded] = useState(false);
  const [activeSystemSection, setActiveSystemSection] = useState('general');
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const userRole = localStorage.getItem('userRole');

    // Check for admin or librarian role
    if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'librarian') {
      console.log('Access denied - not authorized. Role:', userRole);
      navigate('/login');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data: notificationsData, error: notificationsError } = await getAdminNotifications('admin');

        if (!notificationsError && Array.isArray(notificationsData)) {
          setNotifications(notificationsData);
          setUnreadCount(notificationsData.filter((n) => !n.read).length);
        } else {
          // Set empty arrays on error to prevent UI issues
          setNotifications([]);
          setUnreadCount(0);
        }

        // Fetch user info
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
          setUserInfo(JSON.parse(currentUser));
        }
      } catch (err) {
        console.error('Error loading admin stats:', err);
        // Set empty arrays on error to prevent UI issues
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    void loadStats();
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
    // SuperAdmin doesn't have a separate profile tab, could navigate to settings or show alert
    alert('Profile feature coming soon');
  };

  const handleSettingsClick = () => {
    setActiveSystemSection('general');
    setActiveTab('system');
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      // Refresh notifications
      const { data: notificationsData } = await api.get('/notifications');
      if (Array.isArray(notificationsData)) {
        setNotifications(notificationsData);
        setUnreadCount(notificationsData.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      await api.delete('/notifications/all');
      // Refresh notifications
      const { data: notificationsData } = await api.get('/notifications');
      if (Array.isArray(notificationsData)) {
        setNotifications(notificationsData);
        setUnreadCount(notificationsData.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const sidebarItems = [
    { id: 'home', label: 'Dashboard', icon: FiHome },
    { id: 'analytics', label: 'Analytics', icon: FiDatabase },
    { id: 'schools', label: 'Schools', icon: FiGlobe },
    { id: 'roles', label: 'Roles', icon: FiShield },
    { id: 'users', label: 'Users', icon: FiUsers },
    { id: 'books', label: 'Books', icon: FiBook },
    { id: 'inbox', label: 'Inbox', icon: FiMail },
  ];

  const systemSettingsSections = [
    { id: 'general', label: 'General Settings' },
    { id: 'authentication', label: 'Authentication' },
    { id: 'library', label: 'Library Settings' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'backup', label: 'Backup & Maintenance' },
    { id: 'security', label: 'Security' },
  ];

  const mobileNavItems = [
    { id: 'home', label: 'Dashboard', icon: FiHome },
    { id: 'schools', label: 'Schools', icon: FiGlobe },
    { id: 'users', label: 'Users', icon: FiUsers },
    { id: 'inbox', label: 'Inbox', icon: FiMail },
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile Access Blocked Screen */}
      {isMobile ? (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-slate-100">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiSmartphone className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">
              Access Restricted
            </h1>
            <p className="text-slate-600 mb-6">
              The Super Admin portal is only accessible on desktop computers, laptops, and tablets. Mobile devices are not supported.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-4 text-slate-700">
                <div className="flex flex-col items-center">
                  <FiMonitor className="w-8 h-8 text-green-500 mb-2" />
                  <span className="text-xs font-medium">Desktop</span>
                </div>
                <div className="flex flex-col items-center">
                  <FiMonitor className="w-8 h-8 text-green-500 mb-2" />
                  <span className="text-xs font-medium">Laptop</span>
                </div>
                <div className="flex flex-col items-center">
                  <FiMonitor className="w-8 h-8 text-green-500 mb-2" />
                  <span className="text-xs font-medium">Tablet</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      ) : (
        <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className={`fixed left-0 top-0 h-full w-64 z-50 hidden lg:block ${darkMode ? 'bg-gray-800 border-r border-gray-700' : 'bg-white border-r border-gray-200'}`}>
          <div className="flex flex-col h-full">
            {/* Brand Section */}
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <img src="/L.png" alt="Libralink Logo" className="w-9 h-9 rounded-lg object-cover" />
                <div>
                  <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>LibraLink</span>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Super Admin</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-3">
              <nav className="space-y-1">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 group relative ${
                      activeTab === item.id
                        ? darkMode
                          ? 'text-white font-semibold bg-gray-700 border-l-2 border-blue-500'
                          : 'text-gray-900 font-semibold bg-slate-50 border-l-2 border-blue-600'
                        : darkMode
                          ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <item.icon className={`w-5 h-5 ${activeTab === item.id ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-gray-500 group-hover:text-gray-400' : 'text-gray-400 group-hover:text-gray-500')}`} />
                      {item.id === 'inbox' && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}

                {/* System Settings Dropdown */}
                <div className="mt-2">
                  <button
                    onClick={() => setSystemSettingsExpanded(!systemSettingsExpanded)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all duration-150 group ${
                      systemSettingsExpanded || activeTab === 'system'
                        ? darkMode
                          ? 'text-white font-semibold bg-gray-700 border-l-2 border-blue-500'
                          : 'text-gray-900 font-semibold bg-slate-50 border-l-2 border-blue-600'
                        : darkMode
                          ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FiSettings className={`w-5 h-5 ${systemSettingsExpanded || activeTab === 'system' ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-gray-500 group-hover:text-gray-400' : 'text-gray-400 group-hover:text-gray-500')}`} />
                      <span className="text-sm">System Settings</span>
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform ${systemSettingsExpanded ? 'rotate-180' : ''} ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Items */}
                  {systemSettingsExpanded && (
                    <div className="ml-6 mt-1 space-y-1 relative z-10 pointer-events-auto">
                      {systemSettingsSections.map((section) => (
                        <button
                          key={section.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setActiveSystemSection(section.id);
                            setActiveTab('system');
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-150 text-sm cursor-pointer relative z-10 pointer-events-auto ${
                            activeTab === 'system' && activeSystemSection === section.id
                              ? darkMode
                                ? 'text-blue-400 font-semibold bg-gray-700'
                                : 'text-blue-600 font-semibold bg-blue-50'
                              : darkMode
                                ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'
                          }`}
                          style={{ pointerEvents: 'auto' }}
                        >
                          {section.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </nav>
            </div>

            {/* Bottom Section */}
            <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 mb-2 ${darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'}`}
              >
                {darkMode ? <FiSun className="w-5 h-5 text-gray-400" /> : <FiMoon className="w-5 h-5 text-gray-400" />}
                <span className="text-sm">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 ${darkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'}`}
            >
              <FiLogOut className="w-5 h-5" />
              <span className="text-sm">Logout</span>
            </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 lg:ml-64 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {/* Global Header */}
          <GlobalHeader
            userName={userInfo?.firstname || userInfo?.name || 'Super Admin'}
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
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>LibraLink</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {darkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleLogout}
                  className={`p-2 rounded-lg ${darkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-500 hover:bg-red-50'}`}
                >
                  <FiLogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
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
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
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
            {activeTab === 'home' && <SuperAdminDashboard darkMode={darkMode} onOpenInbox={() => setActiveTab('inbox')} />}
            {activeTab === 'analytics' && <SuperAdminAnalytics darkMode={darkMode} />}
            {activeTab === 'schools' && <SuperAdminSchools darkMode={darkMode} />}
            {activeTab === 'roles' && <SuperAdminRoles darkMode={darkMode} />}
            {activeTab === 'users' && <SuperAdminUsers darkMode={darkMode} />}
            {activeTab === 'books' && <SuperAdminBooks darkMode={darkMode} />}
            {activeTab === 'system' && <SuperAdminSettings darkMode={darkMode} initialSection={activeSystemSection} key={activeSystemSection} />}
            {activeTab === 'inbox' && <SuperAdminInbox darkMode={darkMode} notifications={notifications} />}
          </div>
        </main>
      </div>
      )}

      <ConfirmationOverlay
        show={showLogoutConfirmation}
        title="Confirm Logout"
        message="Are you sure you want to log out? You will need to log in again to access the system."
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirmation(false)}
      />
    </div>
  );
}

export default Admin;
