import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FiBell, FiUser, FiChevronDown, FiSettings, FiLogOut, FiCheck, FiX, 
  FiTrash2, FiClock, FiMoreVertical, FiSearch, FiBook, FiRotateCcw, 
  FiUserCheck, FiFileText, FiSun, FiMoon, FiShield, FiExternalLink, FiSliders
} from 'react-icons/fi';
import { getBackendAssetUrl, markAllNotificationsAsRead } from '../../utils/api';

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
  const navigate = useNavigate();
  const location = useLocation();

  const roleLower = (userRole || localStorage.getItem('userRole') || '').toLowerCase().trim();
  const roleId = String(localStorage.getItem('roleId') || '');
  const isAdminLibrarian = roleId === '2' || 
                           roleLower === 'admin-librarian' || 
                           roleLower === 'admin_librarian' || 
                           roleLower === 'librarian_admin' || 
                           roleLower === 'librarian admin';
  
  const isLibrarianAdminRoute = location.pathname.startsWith('/librarian-admin');
  const isLibrarianRoute = location.pathname.startsWith('/librarian') && !isLibrarianAdminRoute;

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [localUnreadCount, setLocalUnreadCount] = useState(unreadCount || 0);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);

  useEffect(() => {
    setLocalUnreadCount(unreadCount || 0);
  }, [unreadCount]);

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

  const handleMarkAllAsReadClick = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      if (Array.isArray(notifications)) {
        notifications.forEach(n => { n.read = true; n.is_read = true; });
      }
      setLocalUnreadCount(0);
    } catch (err) {
      console.error('Error marking all read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleToggleNotificationDropdown = async () => {
    const nextOpen = !notificationDropdownOpen;
    setNotificationDropdownOpen(nextOpen);

    // If opening with unread notifications, clear badge immediately (Facebook style!)
    if (nextOpen && localUnreadCount > 0) {
      setLocalUnreadCount(0);
      try {
        await markAllNotificationsAsRead();
        if (Array.isArray(notifications)) {
          notifications.forEach(n => { n.read = true; n.is_read = true; });
        }
      } catch (err) {
        console.error('Error auto-marking notifications as seen:', err);
      }
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
      <div className="flex items-center gap-3">
        {/* Role Switcher Pill for Admin Librarian */}
        {isAdminLibrarian && isLibrarianAdminRoute && (
          <button
            onClick={() => navigate('/librarian')}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-xs cursor-pointer ${
              darkMode
                ? 'bg-blue-950/60 text-blue-300 border-blue-800 hover:bg-blue-900/80 hover:text-white'
                : 'bg-blue-50/90 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
            }`}
            title="Switch to Librarian Circulation Counter"
          >
            <FiRotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span>Circulation Desk</span>
          </button>
        )}

        {isAdminLibrarian && isLibrarianRoute && (
          <button
            onClick={() => navigate('/librarian-admin')}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-xs cursor-pointer ${
              darkMode
                ? 'bg-purple-950/60 text-purple-300 border-purple-800 hover:bg-purple-900/80 hover:text-white'
                : 'bg-purple-50/90 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300'
            }`}
            title="Return to Admin Management Console"
          >
            <FiShield className="w-3.5 h-3.5 text-purple-600" />
            <span>Admin Console</span>
          </button>
        )}

        {/* Switch to Student Preview */}
        {isAdminLibrarian && (
          <button
            onClick={() => navigate('/studentpage')}
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-xs cursor-pointer ${
              darkMode
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/80 hover:text-white'
                : 'bg-emerald-50/90 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
            }`}
            title="Preview Student / Reader Experience"
          >
            <FiExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            <span>Student View</span>
          </button>
        )}

        {/* Notification Bell (Clean Light Style) */}
        <div className="notification-dropdown-container relative">
          <button
            onClick={handleToggleNotificationDropdown}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs active:scale-95 ${
              notificationDropdownOpen
                ? 'bg-blue-50 text-blue-600 border border-blue-200 ring-2 ring-blue-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-blue-600 border border-slate-200/80'
            }`}
            title="Notifications"
          >
            <FiBell className="w-4 h-4" />
            {localUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-tr from-red-600 to-rose-500 text-white text-[10px] font-black min-w-[19px] h-[19px] px-1 rounded-full flex items-center justify-center ring-2 ring-white shadow-md animate-in zoom-in-75 duration-200">
                {localUnreadCount > 99 ? '99+' : localUnreadCount}
              </span>
            )}
          </button>

          {/* Compact Minimalist Notification Dropdown */}
          {notificationDropdownOpen && (
            <div className="notification-dropdown absolute right-0 mt-2 w-[320px] sm:w-[350px] max-h-[500px] flex flex-col rounded-2xl border border-slate-200/90 bg-white text-slate-900 shadow-2xl shadow-slate-200/60 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Minimal Header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/90">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                      <FiBell className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-bold text-xs tracking-tight text-slate-900">Notifications</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {localUnreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsReadClick}
                        disabled={markingAll}
                        className="text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors px-1.5 py-0.5 rounded text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Mark all as read"
                      >
                        <FiCheck className="w-3 h-3" />
                        <span>{markingAll ? 'Marking...' : 'Mark all read'}</span>
                      </button>
                    )}
                    {localUnreadCount > 0 && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {localUnreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Minimal Segmented Tabs */}
                <div className="flex gap-1 p-0.5 rounded-xl border bg-slate-200/70 border-slate-200/80">
                  <button
                    onClick={() => setNotificationFilter('all')}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      notificationFilter === 'all'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setNotificationFilter('unread')}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      notificationFilter === 'unread'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Unread {unreadCount > 0 && `(${unreadCount})`}
                  </button>
                  <button
                    onClick={() => setNotificationFilter('read')}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      notificationFilter === 'read'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Read
                  </button>
                </div>
              </div>
              
              {/* Minimal Notification List */}
              <div className="flex-1 overflow-y-auto max-h-[340px] divide-y divide-slate-100 custom-scrollbar bg-white">
                {(() => {
                  const roleFilteredNotifications = getFilteredNotifications();
                  const filteredNotifications = roleFilteredNotifications.filter(n => {
                    if (notificationFilter === 'all') return true;
                    if (notificationFilter === 'unread') return !n.read;
                    if (notificationFilter === 'read') return n.read;
                    return true;
                  });

                  return filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => {
                      // Smart student name extraction from message (e.g. "Nelle Lopez submitted request...")
                      const parsedNameMatch = String(notification.message || '').match(/^([A-Za-z\s.]+?)\s+(?:has\s+)?(?:submitted|requested|borrowed|canceled|cancelled|returned|claimed)/i);
                      const msgName = parsedNameMatch ? parsedNameMatch[1].trim() : null;

                      const isSchoolLike = (str) => {
                        if (!str) return true;
                        const s = str.toLowerCase();
                        return s.includes('college') || s.includes('school') || s.includes('pampanga') || s.includes('gnc') || s.includes('src') || s.includes('desk') || s.includes('university');
                      };

                      const senderName = (msgName && isSchoolLike(notification.sender_name))
                        ? msgName
                        : (notification.student_name && !isSchoolLike(notification.student_name))
                        ? notification.student_name
                        : (notification.sender_name && !isSchoolLike(notification.sender_name))
                        ? notification.sender_name
                        : (msgName || notification.firstname || 'Student Borrower');

                      const profilePic = notification.profile_picture || 
                                         notification.sender_profile_picture || 
                                         notification.student_profile_picture || 
                                         notification.profile_image || 
                                         null;

                      const initials = senderName
                        .split(' ')
                        .filter(Boolean)
                        .map(p => p[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'ST';

                      const roleBadgeText = getRoleDisplay(notification.sender_role || notification.role || 'STUDENT', notification.school_code);
                      const isUnread = !notification.read;

                      return (
                        <div
                          key={notification.notification_id}
                          className={`group relative px-3.5 py-3 transition-colors ${
                            isUnread 
                              ? 'bg-blue-50/60 hover:bg-blue-50' 
                              : 'bg-white hover:bg-slate-50'
                          } ${deletingId === notification.notification_id ? 'opacity-40' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Compact Profile Avatar */}
                            <div className="w-9 h-9 rounded-full text-white font-black text-[11px] flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200 bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xs relative">
                              {profilePic ? (
                                <img 
                                  src={getBackendAssetUrl(profilePic)} 
                                  alt={senderName} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.parentElement.querySelector('.fallback-initials');
                                    if (fallback) fallback.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <span className={`fallback-initials ${profilePic ? 'hidden' : 'flex items-center justify-center'}`}>
                                {initials}
                              </span>
                            </div>

                            {/* Info */}
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => {
                                notification.read = true;
                                notification.is_read = true;
                                onNotificationClick(notification);
                                setNotificationDropdownOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {senderName}
                                </p>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                  roleBadgeText.includes('SUPER ADMIN') 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : roleBadgeText.includes('ADMIN') 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : roleBadgeText.includes('LIBRARIAN') 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {roleBadgeText}
                                </span>
                              </div>

                              <p className="text-[11px] line-clamp-2 leading-relaxed font-normal text-slate-700">
                                {notification.message || notification.title}
                              </p>

                              <div className="flex items-center justify-between gap-1 mt-1.5">
                                <span className="text-[10px] flex items-center gap-1 font-medium text-slate-500">
                                  <FiClock className="w-2.5 h-2.5" />
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                                {isUnread && (
                                  <span className="w-2 h-2 bg-blue-600 rounded-full ring-2 ring-blue-200" />
                                )}
                              </div>
                            </div>

                            {/* Delete icon */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotificationToDelete(notification);
                                setShowDeleteConfirm(true);
                              }}
                              disabled={deletingId === notification.notification_id}
                              className="p-1 rounded-md transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center bg-white">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 bg-slate-100 text-slate-400">
                        <FiBell className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">No notifications</p>
                      <p className="text-[10px] text-slate-500">You're all caught up!</p>
                    </div>
                  );
                })()}
              </div>

              {/* Minimal Footer */}
              {notifications && notifications.length > 0 && (
                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (onNotificationClick) onNotificationClick();
                      else if (onNavigateTab) onNavigateTab('borrow-requests');
                      setNotificationDropdownOpen(false);
                    }}
                    className="text-xs font-bold transition-colors text-blue-600 hover:text-blue-700"
                  >
                    View All
                  </button>
                  {onDeleteAllNotifications && (
                    <button
                      onClick={() => setShowDeleteAllConfirm(true)}
                      disabled={deletingAll}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
                    >
                      <FiTrash2 className="w-3 h-3" />
                      <span>Clear All</span>
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

                {/* Role Switcher in Profile Menu */}
                {isAdminLibrarian && isLibrarianAdminRoute && (
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/librarian');
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                      darkMode ? 'text-blue-300 hover:bg-blue-950/50' : 'text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    <FiRotateCcw className="w-4 h-4 text-blue-600" />
                    <span>Switch to Circulation Desk</span>
                  </button>
                )}

                {isAdminLibrarian && isLibrarianRoute && (
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/librarian-admin');
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                      darkMode ? 'text-purple-300 hover:bg-purple-950/50' : 'text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    <FiShield className="w-4 h-4 text-purple-600" />
                    <span>Return to Admin Console</span>
                  </button>
                )}

                {/* Switch to Student View */}
                {isAdminLibrarian && (
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/studentpage');
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                      darkMode ? 'text-emerald-300 hover:bg-emerald-950/50' : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <FiExternalLink className="w-4 h-4 text-emerald-600" />
                    <span>Switch to Student View</span>
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
