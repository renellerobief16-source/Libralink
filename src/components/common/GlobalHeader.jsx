import { useState, useEffect } from 'react';
import { FiBell, FiUser, FiChevronDown, FiSettings, FiLogOut, FiCheck, FiX, FiTrash2 } from 'react-icons/fi';

function GlobalHeader({
  userName,
  userRole,
  profileImage,
  unreadCount = 0,
  notifications = [],
  onNotificationClick,
  onProfileClick,
  onSettingsClick,
  onLogout,
  onDeleteNotification,
  onDeleteAllNotifications,
  darkMode = false
}) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all');

  // Role-based notification filtering
  const getFilteredNotifications = () => {
    const roleLower = (userRole || '').toLowerCase();
    
    return notifications.filter(notification => {
      const senderRole = notification.sender_role || notification.role || '';
      const senderRoleLower = senderRole.toLowerCase();
      
      // Librarian: can see from Super Admin, Admin Librarian, and Student
      if (roleLower === 'librarian') {
        return (
          senderRoleLower === 'super_admin' ||
          senderRoleLower === 'super admin' ||
          senderRoleLower === 'admin_librarian' ||
          senderRoleLower === 'admin-librarian' ||
          senderRoleLower === 'librarian admin' ||
          senderRoleLower === 'student'
        );
      }
      
      // Super Admin: can see from Student and Super Admin only
      if (roleLower === 'super_admin' || roleLower === 'super admin') {
        return (
          senderRoleLower === 'student' ||
          senderRoleLower === 'super_admin' ||
          senderRoleLower === 'super admin'
        );
      }
      
      // Admin Librarian: can see from Super Admin, Student, and other Admin Librarians
      if (roleLower === 'admin_librarian' || roleLower === 'admin-librarian' || roleLower === 'librarian admin') {
        return (
          senderRoleLower === 'super_admin' ||
          senderRoleLower === 'super admin' ||
          senderRoleLower === 'student' ||
          senderRoleLower === 'admin_librarian' ||
          senderRoleLower === 'admin-librarian' ||
          senderRoleLower === 'librarian admin'
        );
      }
      
      // Default: show all
      return true;
    });
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.profile-dropdown-container') && !event.target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
      if (!event.target.closest('.notification-dropdown-container') && !event.target.closest('.notification-dropdown')) {
        setNotificationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleDisplay = (role) => {
    if (!role) return '';
    const roleLower = role.toLowerCase();
    if (roleLower === 'super_admin' || roleLower === 'super admin') return 'Super Admin';
    if (roleLower === 'admin_librarian' || roleLower === 'admin-librarian' || roleLower === 'librarian admin') return 'Administrator';
    if (roleLower === 'librarian') return 'Librarian';
    if (roleLower === 'admin') return 'Administrator';
    return role;
  };

  return (
    <header className={`h-16 border-b flex items-center justify-between  py-10 px-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      {/* Left side - empty or page-specific content */}
      <div className="flex-1"></div>

      {/* Right side - Notifications and Profile */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="notification-dropdown-container relative">
          <button
            onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
            className={`relative p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <FiBell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notificationDropdownOpen && (
            <div className="notification-dropdown absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-96 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <span className="text-xs text-gray-500">{unreadCount} unread</span>
                </div>
                {/* Filter Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setNotificationFilter('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      notificationFilter === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setNotificationFilter('unread')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      notificationFilter === 'unread'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Unread
                  </button>
                  <button
                    onClick={() => setNotificationFilter('read')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      notificationFilter === 'read'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Read
                  </button>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {(() => {
                  const roleFilteredNotifications = getFilteredNotifications();
                  const filteredNotifications = roleFilteredNotifications.filter(n => {
                    if (notificationFilter === 'all') return true;
                    if (notificationFilter === 'unread') return !n.read;
                    if (notificationFilter === 'read') return n.read;
                    return true;
                  });

                  return filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => (
                      <div
                        key={notification.notification_id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Profile Picture */}
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {notification.profile_picture || notification.sender_profile_picture ? (
                              <img 
                                src={notification.profile_picture || notification.sender_profile_picture} 
                                alt="Profile" 
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <FiUser className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              onNotificationClick(notification);
                              setNotificationDropdownOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {notification.sender_name || notification.firstname || notification.borrower_name || notification.student_name || 'Unknown'}
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                notification.sender_role === 'Super Admin' ? 'bg-purple-100 text-purple-700' :
                                notification.sender_role === 'Admin Librarian' || notification.sender_role === 'Librarian Admin' ? 'bg-blue-100 text-blue-700' :
                                notification.sender_role === 'Student' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {notification.sender_role || notification.role || 'User'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 truncate">{notification.message || notification.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{notification.created_at ? new Date(notification.created_at).toLocaleDateString() : ''}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDeleteNotification) {
                                onDeleteNotification(notification.notification_id);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            title="Delete notification"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <FiBell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No notifications</p>
                    </div>
                  );
                })()}
              </div>

              {notifications && notifications.length > 0 && (
                <div className="p-3 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => {
                      onNotificationClick();
                      setNotificationDropdownOpen(false);
                    }}
                    className="flex-1 text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All
                  </button>
                  {onDeleteAllNotifications && (
                    <button
                      onClick={() => {
                        onDeleteAllNotifications();
                        setNotificationDropdownOpen(false);
                      }}
                      className="flex-1 text-center text-sm text-red-600 hover:text-red-700 font-medium flex items-center justify-center gap-1"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      Delete All
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Section */}
        <div className="profile-dropdown-container relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {/* Profile Avatar */}
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <FiUser className="w-5 h-5 text-white" />
              )}
            </div>

            {/* User Info - Desktop */}
            <div className="text-left hidden sm:block">
              <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {userName || 'User'}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {getRoleDisplay(userRole)}
              </p>
            </div>

            {/* Dropdown Arrow */}
            <FiChevronDown className={`w-4 h-4 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''} ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>

          {/* Profile Dropdown */}
          {profileDropdownOpen && (
            <div className="profile-dropdown absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-2 z-50">
              <button
                onClick={() => {
                  onProfileClick();
                  setProfileDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <FiUser className="w-4 h-4 text-gray-500" />
                Profile
              </button>
              <button
                onClick={() => {
                  onSettingsClick();
                  setProfileDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <FiSettings className="w-4 h-4 text-gray-500" />
                Settings
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={() => {
                  onLogout();
                  setProfileDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
              >
                <FiLogOut className="w-4 h-4 text-red-500" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default GlobalHeader;
