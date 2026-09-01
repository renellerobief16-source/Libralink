import { useState, useEffect } from 'react';
import { FiBell, FiUser, FiChevronDown, FiSettings, FiLogOut, FiCheck, FiX, FiTrash2, FiClock, FiMoreVertical } from 'react-icons/fi';
import { getBackendAssetUrl } from '../../utils/api';

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
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);

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

  const getRoleDisplay = (role, schoolCode) => {
    if (!role) return '';
    const roleLower = role.toLowerCase();
    let roleDisplay = '';
    
    if (roleLower === 'super_admin' || roleLower === 'super admin') {
      roleDisplay = 'SUPER ADMIN';
    } else if (roleLower === 'admin_librarian' || roleLower === 'admin-librarian' || roleLower === 'librarian admin') {
      roleDisplay = 'ADMIN-LIBRARIAN';
    } else if (roleLower === 'librarian') {
      roleDisplay = 'LIBRARIAN';
    } else if (roleLower === 'student') {
      roleDisplay = 'STUDENT';
    } else if (roleLower === 'admin') {
      roleDisplay = 'ADMIN';
    } else {
      roleDisplay = role.toUpperCase();
    }
    
    // Add school code prefix if available and not Super Admin
    if (schoolCode && roleLower !== 'super_admin' && roleLower !== 'super admin') {
      return `${schoolCode} ${roleDisplay}`;
    }
    
    return roleDisplay;
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleDeleteNotification = async (notificationId) => {
    setDeletingId(notificationId);
    try {
      await onDeleteNotification(notificationId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllNotifications = async () => {
    setDeletingAll(true);
    try {
      await onDeleteAllNotifications();
      setShowDeleteAllConfirm(false);
    } finally {
      setDeletingAll(false);
    }
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
            <div className="notification-dropdown absolute right-0 mt-2 w-96 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 max-h-[500px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FiBell className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {unreadCount} unread
                  </span>
                </div>
                {/* Filter Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setNotificationFilter('all')}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      notificationFilter === 'all'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setNotificationFilter('unread')}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      notificationFilter === 'unread'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Unread
                  </button>
                  <button
                    onClick={() => setNotificationFilter('read')}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      notificationFilter === 'read'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Read
                  </button>
                </div>
              </div>
              
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
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
                        className={`group relative p-4 border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ${!notification.read ? 'bg-blue-50/50' : ''} ${deletingId === notification.notification_id ? 'opacity-50 scale-95' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Profile Picture */}
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-white shadow-sm">
                            {notification.profile_picture || notification.sender_profile_picture ? (
                              <img 
                                src={getBackendAssetUrl(notification.profile_picture || notification.sender_profile_picture)} 
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
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-semibold text-gray-900">
                                {notification.sender_name || notification.firstname || notification.borrower_name || notification.student_name || 'Unknown'}
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                notification.sender_role === 'Super Admin' || notification.sender_role === 'SUPER ADMIN' ? 'bg-purple-100 text-purple-700' :
                                notification.sender_role?.includes('Admin') || notification.sender_role?.includes('ADMIN') ? 'bg-blue-100 text-blue-700' :
                                notification.sender_role === 'Student' || notification.sender_role === 'STUDENT' ? 'bg-green-100 text-green-700' :
                                notification.sender_role === 'Librarian' || notification.sender_role === 'LIBRARIAN' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {getRoleDisplay(notification.sender_role || notification.role, notification.school_code)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">{notification.message || notification.title}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <FiClock className="w-3 h-3" />
                                {formatTimeAgo(notification.created_at)}
                              </span>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotificationToDelete(notification);
                              setShowDeleteConfirm(true);
                            }}
                            disabled={deletingId === notification.notification_id}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 flex-shrink-0 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Delete notification"
                          >
                            {deletingId === notification.notification_id ? (
                              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <FiTrash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiBell className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">No notifications</p>
                      <p className="text-xs text-gray-500">You're all caught up!</p>
                    </div>
                  );
                })()}
              </div>

              {notifications && notifications.length > 0 && (
                <div className="p-3 border-t border-gray-100 bg-gray-50 flex gap-2">
                  <button
                    onClick={() => {
                      onNotificationClick();
                      setNotificationDropdownOpen(false);
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    View All
                  </button>
                  {onDeleteAllNotifications && (
                    <button
                      onClick={() => setShowDeleteAllConfirm(true)}
                      disabled={deletingAll}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {deletingAll ? (
                        <>
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <FiTrash2 className="w-4 h-4" />
                          Delete All
                        </>
                      )}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && notificationToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FiTrash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Notification</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this notification from {notificationToDelete.sender_name || 'Unknown'}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setNotificationToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteNotification(notificationToDelete.notification_id);
                  setShowDeleteConfirm(false);
                  setNotificationToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FiTrash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete All Notifications</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete all notifications? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllNotifications}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default GlobalHeader;
