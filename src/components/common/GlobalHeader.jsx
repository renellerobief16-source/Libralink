import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FiBell, FiUser, FiChevronDown, FiSettings, FiLogOut, FiCheck, FiX, 
  FiTrash2, FiClock, FiMoreVertical, FiSearch, FiBook, FiRotateCcw, 
  FiUserCheck, FiFileText, FiSun, FiMoon, FiShield, FiExternalLink, FiSliders
} from 'react-icons/fi';
import { getBackendAssetUrl } from '../../utils/api';

const DESK_SHORTCUTS = [
  { id: 'circulation-counter', title: 'Circulation Desk & Scan', description: 'Fast student check-in, QR scan & desk return', icon: FiRotateCcw, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'borrow-requests', title: 'Borrow Requests', description: 'Approve, reject, or review student requests', icon: FiCheck, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'books', title: 'Book Catalog', description: 'Explore campus book inventory and holdings', icon: FiBook, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'overdue-books', title: 'Overdue Loans & Fines', description: 'Track overdue books, fines, and return dates', icon: FiClock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'students', title: 'Register Student', description: 'Enroll student borrowers and assign cards', icon: FiUserCheck, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'list-students', title: 'Students Directory', description: 'View active accounts and student standing', icon: FiUser, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { id: 'history', title: 'Circulation History', description: 'Past returns, issued books, and audit log', icon: FiFileText, color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

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
  darkMode = false,
  schoolId = null,
  books = [],
  schoolInfo = null,
  onNavigateTab,
  onToggleDarkMode,
  onOpenStaffModal,
}) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchActiveIndex, setSearchActiveIndex] = useState(-1);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Role-based notification filtering with school isolation:
  // - Super Admin sees everything (all schools).
  // - Everyone else only sees notifications for their own school PLUS
  //   global announcements (is_global = true / school_id null).
  const getFilteredNotifications = () => {
    const roleLower = (userRole || '').toLowerCase();
    const currentSchoolId = schoolId != null
      ? String(schoolId)
      : (localStorage.getItem('schoolId') != null ? String(localStorage.getItem('schoolId')) : null);

    const isSuperAdmin =
      roleLower === 'super_admin' ||
      roleLower === 'super admin' ||
      roleLower === 'admin';

    return notifications.filter(notification => {
      const senderRole = notification.sender_role || notification.role || '';
      const senderRoleLower = senderRole.toLowerCase();

      // Global announcements are visible to everyone, regardless of school.
      if (
        notification.is_global === true ||
        notification.type === 'announcement' ||
        notification.school_id == null
      ) {
        return true;
      }

      // Super admins can see everything.
      if (isSuperAdmin) {
        return true;
      }

      // School isolation: hide notifications that belong to another school.
      const notificationSchoolId = notification.school_id != null
        ? String(notification.school_id)
        : (notification.school_code ? null : null);
      if (currentSchoolId && notificationSchoolId && notificationSchoolId !== currentSchoolId) {
        return false;
      }

      // Libraries shouldn't see each-other's cross-school sender rows at all.
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

      // Admin Librarian: can see from Super Admin, Student, and her own staff
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

      // Default: show all (super admin handled above)
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
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter shortcuts based on searchQuery
  const filteredShortcuts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return DESK_SHORTCUTS.slice(0, 5);
    return DESK_SHORTCUTS.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Filter books based on searchQuery
  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !Array.isArray(books)) return [];
    return books.filter(b => {
      const title = (b.title || '').toLowerCase();
      const author = (b.author || '').toLowerCase();
      const isbn = (b.isbn || '').toLowerCase();
      const category = (b.category || b.genre || '').toLowerCase();
      return title.includes(q) || author.includes(q) || isbn.includes(q) || category.includes(q);
    }).slice(0, 6);
  }, [searchQuery, books]);

  // Combined flat items for keyboard navigation
  const flatSearchItems = useMemo(() => {
    const items = [];
    filteredShortcuts.forEach(s => items.push({ type: 'shortcut', item: s }));
    filteredBooks.forEach(b => items.push({ type: 'book', item: b }));
    return items;
  }, [filteredShortcuts, filteredBooks]);

  const handleSelectShortcut = (shortcut) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onNavigateTab) {
      onNavigateTab(shortcut.id);
    }
  };

  const handleSelectBook = (book) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onNavigateTab) {
      onNavigateTab('books', book);
    }
  };

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
    <header className={`h-16 sticky top-0 z-30 border-b flex items-center justify-between px-3 sm:px-6 transition-all duration-200 ${darkMode ? 'bg-gray-900/95 border-gray-800 backdrop-blur-md shadow-xs' : 'bg-white/95 border-slate-200/90 backdrop-blur-md shadow-xs'}`}>
      {/* Left side - Campus indicator & Smart Search Bar (adapted from Student page) */}
      <div className="flex-1 max-w-xl flex items-center gap-2.5 sm:gap-3">
        {/* Mobile Brand Mark */}
        <div className="flex items-center gap-2 lg:hidden shrink-0">
          <img src="/L.png" alt="LibraLink" className="w-8 h-8 rounded-xl object-cover shadow-xs" />
        </div>

        {schoolInfo && (
          <div className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 border transition-colors ${
            darkMode ? 'bg-gray-800/90 border-gray-700 text-blue-400' : 'bg-blue-50/90 border-blue-200/70 text-blue-700'
          }`}>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="font-mono text-[11px]">{schoolInfo.school_code || 'LIB'}</span>
            <span className="text-slate-300 dark:text-gray-600">•</span>
            <span className="truncate max-w-[120px]">{schoolInfo.school_name}</span>
          </div>
        )}

        <div ref={searchContainerRef} className="relative flex-1">
          <div className="relative flex items-center">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
                setSearchActiveIndex(-1);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setIsSearchOpen(true);
                  setSearchActiveIndex((prev) => (prev < flatSearchItems.length - 1 ? prev + 1 : 0));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSearchActiveIndex((prev) => (prev > 0 ? prev - 1 : flatSearchItems.length - 1));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchActiveIndex >= 0 && flatSearchItems[searchActiveIndex]) {
                    const selected = flatSearchItems[searchActiveIndex];
                    if (selected.type === 'shortcut') handleSelectShortcut(selected.item);
                    else handleSelectBook(selected.item);
                  } else if (searchQuery.trim()) {
                    if (onNavigateTab) onNavigateTab('books');
                    setIsSearchOpen(false);
                  }
                } else if (e.key === 'Escape') {
                  setIsSearchOpen(false);
                  setSearchActiveIndex(-1);
                }
              }}
              placeholder="Search catalog, ISBN, or desk action..."
              className={`w-full h-10 sm:h-11 pl-10 pr-9 rounded-full text-xs sm:text-sm font-medium transition-all shadow-2xs border ${
                darkMode
                  ? 'bg-gray-800/90 border-gray-700 text-white placeholder-gray-400 focus:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-slate-100/70 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Live Dropdown Preview */}
          {isSearchOpen && (
            <div className={`absolute left-0 right-0 top-full mt-2 rounded-2xl border shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150 ${
              darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              {/* Shortcuts Section */}
              {filteredShortcuts.length > 0 && (
                <div className="p-2 border-b border-gray-100 dark:border-gray-700/60">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400 flex items-center justify-between">
                    <span>Circulation Shortcuts</span>
                    <span className="font-normal text-[9px]">Press ↵ to jump</span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {filteredShortcuts.map((shortcut, idx) => {
                      const Icon = shortcut.icon;
                      const isSelected = searchActiveIndex === idx;
                      return (
                        <button
                          key={shortcut.id}
                          onClick={() => handleSelectShortcut(shortcut)}
                          onMouseEnter={() => setSearchActiveIndex(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                            isSelected
                              ? (darkMode ? 'bg-gray-700 text-white' : 'bg-blue-50 text-blue-900 font-semibold')
                              : (darkMode ? 'hover:bg-gray-700/60 text-gray-200' : 'hover:bg-slate-50 text-slate-700')
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 border ${shortcut.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">{shortcut.title}</p>
                            <p className="text-[10px] text-slate-400 truncate">{shortcut.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Book Results Section */}
              {searchQuery.trim() && (
                <div className="p-2">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400 flex items-center justify-between">
                    <span>Book Catalog Results ({filteredBooks.length})</span>
                    {filteredBooks.length > 0 && (
                      <button
                        onClick={() => {
                          if (onNavigateTab) onNavigateTab('books');
                          setIsSearchOpen(false);
                        }}
                        className="text-blue-600 hover:underline font-semibold text-[10px]"
                      >
                        View all in catalog
                      </button>
                    )}
                  </div>

                  {filteredBooks.length > 0 ? (
                    <div className="space-y-1 mt-1">
                      {filteredBooks.map((book, bIdx) => {
                        const itemIndex = filteredShortcuts.length + bIdx;
                        const isSelected = searchActiveIndex === itemIndex;
                        const isAvail = (book.available_copies ?? book.quantity ?? 1) > 0;
                        return (
                          <button
                            key={book.book_id || book.id || bIdx}
                            onClick={() => handleSelectBook(book)}
                            onMouseEnter={() => setSearchActiveIndex(itemIndex)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                              isSelected
                                ? (darkMode ? 'bg-gray-700 text-white' : 'bg-blue-50 text-blue-900 font-semibold')
                                : (darkMode ? 'hover:bg-gray-700/60 text-gray-200' : 'hover:bg-slate-50 text-slate-700')
                            }`}
                          >
                            <div className="w-8 h-10 rounded bg-slate-100 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200 dark:border-gray-600">
                              {book.cover_image ? (
                                <img src={getBackendAssetUrl(book.cover_image)} alt={book.title} className="w-full h-full object-cover" />
                              ) : (
                                <FiBook className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate">{book.title}</p>
                              <p className="text-[10px] text-slate-400 truncate">{book.author || 'Unknown Author'} {book.isbn ? `• ISBN: ${book.isbn}` : ''}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              isAvail 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                            }`}>
                              {isAvail ? `${book.available_copies ?? book.quantity ?? 1} in stock` : 'Out of stock'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No matching books found for "{searchQuery}".
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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

          {/* Profile Dropdown (Adapted from Student Page Header) */}
          {profileDropdownOpen && (
            <div className={`profile-dropdown absolute right-0 mt-2 w-64 rounded-2xl border shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
              darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
            }`}>
              {/* Identity Header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      (userName || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{userName || 'Staff Member'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                        {getRoleDisplay(userRole)}
                      </span>
                      {schoolInfo?.school_code && (
                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                          {schoolInfo.school_code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="px-1.5 py-1 space-y-0.5">
                <button
                  onClick={() => {
                    if (onOpenStaffModal) {
                      onOpenStaffModal();
                    } else if (onProfileClick) {
                      onProfileClick();
                    }
                    setProfileDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                    darkMode ? 'text-gray-200 hover:bg-gray-700/70' : 'text-gray-700 hover:bg-slate-100'
                  }`}
                >
                  <FiShield className="w-4 h-4 text-blue-600" />
                  <span>Library Policy & Hours</span>
                </button>

                {onToggleDarkMode && (
                  <button
                    onClick={() => {
                      onToggleDarkMode();
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                      darkMode ? 'text-gray-200 hover:bg-gray-700/70' : 'text-gray-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {darkMode ? <FiSun className="w-4 h-4 text-amber-400" /> : <FiMoon className="w-4 h-4 text-slate-500" />}
                      <span>Dark Appearance</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {darkMode ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )}

                {onSettingsClick && (
                  <button
                    onClick={() => {
                      onSettingsClick();
                      setProfileDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                      darkMode ? 'text-gray-200 hover:bg-gray-700/70' : 'text-gray-700 hover:bg-slate-100'
                    }`}
                  >
                    <FiSettings className="w-4 h-4 text-gray-500" />
                    <span>Account Settings</span>
                  </button>
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700/60 my-1"></div>

              <div className="px-1.5">
                <button
                  onClick={() => {
                    onLogout();
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2.5"
                >
                  <FiLogOut className="w-4 h-4 text-red-500" />
                  <span>Log Out</span>
                </button>
              </div>
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
