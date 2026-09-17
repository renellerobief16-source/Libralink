import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiHome, FiMail, FiLogOut, FiBook, FiUsers, FiList, FiCheckCircle, FiMoon, FiSun, FiSettings, FiGlobe, FiShield, FiDatabase, FiMonitor, FiSmartphone, FiChevronDown, FiActivity } from "react-icons/fi";
import api, { getAdminNotifications, signOut } from "../../../utils/api";
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

  const handleNotificationsChange = async () => {
    const { data: notificationsData, error: notificationsError } = await getAdminNotifications('admin');
    if (!notificationsError && Array.isArray(notificationsData)) {
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter((n) => !n.read).length);
    }
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
    alert('Super Admin profile management is synchronized with institutional credentials.');
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
      await api.delete('/notifications/clear-all');
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
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-600">
              <FiSmartphone className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Super Admin Console
            </h1>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              The Consortium Super Admin command console requires a larger display for operational monitoring, audit logs, and cross-campus analytics. Please use a desktop or laptop browser.
            </p>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm"
            >
              Return to Login
            </button>
          </div>
        </div>
      ) : (
        <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className={`fixed left-0 top-0 h-full w-64 z-50 hidden lg:block ${darkMode ? 'bg-gray-800 border-r border-gray-700' : 'bg-white border-r border-slate-200/70'}`}>
          <div className="flex flex-col h-full">
            {/* Minimalist Seamless Brand & Consortium Header */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img src="/L.png" alt="Libralink Logo" className="w-8 h-8 rounded-lg object-cover shadow-xs" />
                <div className="min-w-0 flex-1">
                  <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">LibraLink</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[11px] font-semibold text-emerald-600 truncate">Consortium Master</p>
                  </div>
                </div>
              </div>
              {/* Consortium Network Live Pulse */}
              <div className="mt-3 px-2.5 py-1 rounded-lg bg-blue-50/80 border border-blue-100/80 flex items-center justify-between text-[10px]">
                <span className="font-semibold text-blue-700 flex items-center gap-1">
                  <FiActivity className="w-3 h-3 text-blue-600" />
                  Network Status
                </span>
                <span className="font-bold text-blue-900">Multi-Campus Active</span>
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
                          ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
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

                {/* System Settings Dropdown */}
                <div className="pt-2 mt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSystemSettingsExpanded(!systemSettingsExpanded)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-150 group cursor-pointer ${
                      systemSettingsExpanded || activeTab === 'system'
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FiSettings className={`w-4 h-4 ${
                        systemSettingsExpanded || activeTab === 'system'
                          ? 'text-blue-600'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`} />
                      <span>System Settings</span>
                    </div>
                    <FiChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${systemSettingsExpanded ? 'rotate-180 text-slate-700' : ''}`} />
                  </button>

                  {/* Dropdown Submenu */}
                  <div className={`mt-1 space-y-0.5 pl-3 overflow-hidden transition-all duration-200 ${systemSettingsExpanded ? 'max-h-72 opacity-100 py-1' : 'max-h-0 opacity-0'}`}>
                    {systemSettingsSections.map((section) => {
                      const isSubActive = activeTab === 'system' && activeSystemSection === section.id;
                      return (
                        <button
                          key={section.id}
                          onClick={() => {
                            setActiveSystemSection(section.id);
                            setActiveTab('system');
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                            isSubActive
                              ? 'bg-blue-50 text-blue-600 font-semibold'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <span className="truncate">{section.label}</span>
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
                onClick={() => setDarkMode(!darkMode)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all mb-1"
              >
                {darkMode ? <FiSun className="w-4 h-4 text-amber-500" /> : <FiMoon className="w-4 h-4 text-slate-400" />}
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
              >
                <FiLogOut className="w-4 h-4 text-rose-500" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 lg:ml-64 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {/* Global Header */}
          <div className="sticky top-0 z-40">
            <GlobalHeader
              userName={userInfo?.firstname || userInfo?.name || 'Super Admin'}
              userRole={localStorage.getItem('userRole')}
              profileImage={userInfo?.profile_picture}
              unreadCount={unreadCount}
              notifications={notifications}
              schoolId={localStorage.getItem('schoolId')}
              onNotificationClick={handleNotificationClick}
              onProfileClick={handleProfileClick}
              onSettingsClick={handleSettingsClick}
              onLogout={handleLogout}
              onDeleteNotification={handleDeleteNotification}
              onDeleteAllNotifications={handleDeleteAllNotifications}
              darkMode={darkMode}
            />
          </div>

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
            {activeTab === 'home' && <SuperAdminDashboard darkMode={darkMode} onNavigate={setActiveTab} onOpenInbox={() => setActiveTab('inbox')} />}
            {activeTab === 'analytics' && <SuperAdminAnalytics darkMode={darkMode} onNavigate={setActiveTab} />}
            {activeTab === 'schools' && <SuperAdminSchools darkMode={darkMode} onNavigate={setActiveTab} />}
            {activeTab === 'roles' && <SuperAdminRoles darkMode={darkMode} onNavigate={setActiveTab} />}
            {activeTab === 'users' && <SuperAdminUsers darkMode={darkMode} onNavigate={setActiveTab} />}
            {activeTab === 'books' && <SuperAdminBooks darkMode={darkMode} onNavigate={setActiveTab} />}
            {activeTab === 'system' && <SuperAdminSettings darkMode={darkMode} initialSection={activeSystemSection} key={activeSystemSection} />}
            {activeTab === 'inbox' && <SuperAdminInbox darkMode={darkMode} notifications={notifications} onNotificationsChange={handleNotificationsChange} onNavigate={setActiveTab} />}
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
