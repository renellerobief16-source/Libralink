import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiHome, FiMail, FiLogOut, FiBook, FiMoon, FiSun, FiUsers, FiList, 
  FiCheckCircle, FiGrid, FiClock, FiFileText, FiAlertOctagon, FiX, FiShield, FiInfo, FiCheck,
  FiSettings, FiUserPlus, FiSliders, FiAward, FiBookOpen, FiUploadCloud
} from "react-icons/fi";
import { getUserNotifications, getBackendAssetUrl, signOut, getBorrowRequests } from "../../../utils/api";
import api from "../../../utils/api";
import { ConfirmationOverlay, GlobalHeader, LogoutConfirmationModal } from "../../common";
import { useNotifications } from "../../../context/NotificationContext";
import {
  LibrarianDashboard as AdminDashboard,
  LibrarianAddStudent as AdminAddStudent,
  LibrarianListStudents as AdminListStudents,
  LibrarianBorrowRequests as AdminBorrowRequests,
  LibrarianBooks as AdminBooks,
  LibrarianInbox as AdminInbox,
  LibrarianQRScanner as AdminQRScanner,
  LibrarianHistory as AdminHistory,
  LibrarianPermissionLetter as AdminPermissionLetter,
  LibrarianOverdueBooks as AdminOverdueBooks,
  LibrarianBooksManagement as AdminBooksManagement,
  LibrarianSettings as AdminSettings,
} from "../../collegeTabs/LibrarianTabs";
import GlobalCirculationScanner from '../../common/GlobalCirculationScanner';

function SHSLibrarianPortal() {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState(() => {
    return typeof window !== "undefined" && window.innerWidth < 1024 ? "students" : "home";
  });
  const [darkMode, setDarkMode] = useState(false);
  const [books, setBooks] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [schoolLogoError, setSchoolLogoError] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [libraryPolicy, setLibraryPolicy] = useState(null);
  const [shsLibrary, setShsLibrary] = useState(null);

  // Keep mobile view confined to the 3 permitted tabs: Registration, Directory, Catalog
  useEffect(() => {
    const handleMobileTabCheck = () => {
      if (window.innerWidth < 1024) {
        setActiveTab(prev => {
          if (!["students", "list-students", "books"].includes(prev)) {
            return "students";
          }
          return prev;
        });
      }
    };
    handleMobileTabCheck();
    window.addEventListener("resize", handleMobileTabCheck);
    return () => window.removeEventListener("resize", handleMobileTabCheck);
  }, []);

  useEffect(() => {
    const rawRole = (localStorage.getItem("userRole") || '').toLowerCase().replace(/[-_]/g, ' ').trim();
    const roleId = Number(localStorage.getItem("roleId") || 0);
    const token = localStorage.getItem("token");
    const schoolId = localStorage.getItem("schoolId");

    const isLibrarianRole =
      rawRole.includes('librarian') ||
      rawRole.includes('admin') ||
      roleId === 1 ||
      roleId === 2 ||
      roleId === 3;

    if (!token || !isLibrarianRole) {
      navigate("/login");
      return;
    }

    const effectiveSchoolId = schoolId && schoolId !== 'null' && schoolId !== 'undefined' ? schoolId : '1';

    // Fetch school and detect SHS library unit
    const fetchSchoolAndLibrary = async () => {
      try {
        const [schoolRes, librariesRes] = await Promise.allSettled([
          api.get(`/schools/${effectiveSchoolId}`),
          api.get(`/libraries/school/${effectiveSchoolId}`)
        ]);

        if (schoolRes.status === 'fulfilled' && schoolRes.value?.data) {
          setSchoolInfo(schoolRes.value.data);
        }

        if (librariesRes.status === 'fulfilled') {
          const payload = librariesRes.value.data;
          const libs = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
          
          // Match SHS library by type or name
          const storedLibId = localStorage.getItem('currentLibraryId');
          let matched = null;
          if (storedLibId) {
            matched = libs.find(l => String(l.library_id || l.id) === String(storedLibId));
          }
          if (!matched) {
            matched = libs.find(l => l.library_type === 'senior_high_school') ||
                      libs.find(l => (l.name || '').toLowerCase().includes('senior high')) ||
                      libs.find(l => (l.name || '').toLowerCase().includes('shs')) ||
                      libs.find(l => (l.name || '').toLowerCase().includes('high school'));
          }

          if (matched) {
            setShsLibrary(matched);
            localStorage.setItem('currentLibraryId', String(matched.library_id || matched.id));
            localStorage.setItem('currentLibraryName', matched.name);
            localStorage.setItem('currentLibraryType', matched.library_type || 'senior_high_school');
          }
        }
      } catch (err) {
        console.error('Error fetching SHS library details:', err);
      }
    };

    fetchSchoolAndLibrary();
  }, [navigate]);

  useEffect(() => setSchoolLogoError(false), [schoolInfo?.logo]);

  useEffect(() => {
    const load = async () => {
      const schoolId = localStorage.getItem("schoolId");
      if (!schoolId) return;
      try {
        const booksRes = await api.get(`/books/school?school_id=${schoolId}&group=true`);
        const booksList = Array.isArray(booksRes.data) ? booksRes.data : (booksRes.data?.books || []);
        
        // Scope books to SHS library if identified
        const libId = shsLibrary?.library_id || shsLibrary?.id || localStorage.getItem('currentLibraryId');
        if (libId && libId !== 'all') {
          setBooks(booksList.filter(b => String(b.library_id) === String(libId)));
        } else {
          setBooks(booksList);
        }

        const notRes = await getUserNotifications();
        if (notRes.data) {
          setNotifications(notRes.data);
          setUnreadCount(notRes.data.filter((n) => !n.read).length);
        }

        const usersRes = await api.get(`/users/school/${schoolId}`);
        const userList = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []);
        const shsStudents = userList.filter((u) => {
          if (u.role_id !== 4 && u.role_id !== 3) return false;
          if (libId && String(u.library_id) === String(libId)) return true;
          const pos = String(u.position || '').toLowerCase();
          return pos.includes('shs') || pos.includes('senior high') || pos.includes('grade 11') || pos.includes('grade 12');
        });
        setStudentCount(shsStudents.length);
        
        // Get pending borrow requests count
        const borrowRes = await getBorrowRequests(schoolId);
        if (borrowRes.data) {
          setPendingRequestsCount(borrowRes.data.filter(r => r.status === 'pending').length);
        }

        // Fetch user info
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
          try {
            setUserInfo(JSON.parse(currentUser));
          } catch {}
        }

        // Fetch school borrowing policy
        try {
          const policyRes = await api.get(`/library-settings/policy/${schoolId}`);
          const fetchedPolicy = policyRes.data?.data || policyRes.data;
          if (fetchedPolicy) {
            setLibraryPolicy(fetchedPolicy);
          }
        } catch (e) {
          console.warn('Could not fetch library policy:', e);
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [shsLibrary]);

  const handleLogout = () => {
    setShowLogoutConfirmation(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (err) {
      console.error(err);
      localStorage.clear();
      navigate("/login");
    }
  };

  const handleNotificationClick = () => {
    setActiveTab('inbox');
  };

  const handleProfileClick = () => {
    setActiveTab('settings');
  };

  const handleSettingsClick = () => {
    setActiveTab('settings');
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      const notRes = await getUserNotifications();
      if (notRes.data) {
        setNotifications(notRes.data);
        setUnreadCount(notRes.data.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      await api.delete('/notifications/clear-all');
      const notRes = await getUserNotifications();
      if (notRes.data) {
        setNotifications(notRes.data);
        setUnreadCount(notRes.data.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  // SHS Navigation sidebar groups - NO Libraries Directory, Separate Borrow Requests & Books
  const sidebarGroups = [
    {
      title: "SHS Operations",
      items: [
        { id: "home", label: "Dashboard", icon: FiHome },
        { id: "book-approved", label: "Circulation Desk (QR)", icon: FiGrid },
        { id: "borrow-requests", label: "Borrow Requests", icon: FiCheckCircle },
      ]
    },
    {
      title: "Collections & Directory",
      items: [
        { id: "books", label: "Book Catalog", icon: FiBook },
        { id: "books-management", label: "Import Books", icon: FiUploadCloud },
        { id: "list-students", label: "Student Directory", icon: FiList },
        { id: "students", label: "Register Student", icon: FiUserPlus },
      ]
    },
    {
      title: "Monitoring & Records",
      items: [
        { id: "overdue-books", label: "Overdue & Fines", icon: FiAlertOctagon },
        { id: "history", label: "Circulation History", icon: FiClock },
        { id: "permission-letter", label: "Permission Letter", icon: FiFileText },
        { id: "inbox", label: "Staff Inbox", icon: FiMail },
      ]
    },
    {
      title: "Preferences",
      items: [
        { id: "settings", label: "Settings", icon: FiSettings },
      ]
    }
  ];

  // Mobile strictly displays: Registration tab, Student Directory tab, Book Catalog tab
  const mobileNavItems = [
    { id: "students", label: "Register", icon: FiUserPlus },
    { id: "list-students", label: "Students", icon: FiList },
    { id: "books", label: "Catalog", icon: FiBook },
  ];

  const effectiveLibraryId = shsLibrary?.library_id || shsLibrary?.id || localStorage.getItem('currentLibraryId') || 'all';

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950 text-white' : 'bg-slate-50/70 text-slate-900'} antialiased`}>
      <div className="flex">
        {/* SHS Librarian Sidebar */}
        <aside className={`fixed left-0 top-0 h-full w-64 z-50 hidden lg:block ${darkMode ? 'bg-gray-900 border-r border-gray-800' : 'bg-white border-r border-slate-200/70'}`}>
          <div className="flex flex-col h-full">
            {/* SHS Brand & Unit Header */}
            <div className={`p-5 border-b ${darkMode ? 'border-gray-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <img src="/L.png" alt="Libralink Logo" className="w-8 h-8 rounded-lg object-cover shadow-2xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-base font-bold tracking-tight block leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>LibraLink</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                      SHS
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-purple-600 truncate mt-0.5" title={shsLibrary?.name || 'Senior High School Library'}>
                    🎓 {shsLibrary?.name || 'Senior High School Library'}
                  </p>
                  {schoolInfo && (
                    <p className="text-[10px] text-slate-400 truncate">
                      {schoolInfo.school_name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation links */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-3 custom-scrollbar">
              {sidebarGroups.map((group, gIdx) => (
                <div key={gIdx}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1">
                    {group.title}
                  </div>
                  <nav className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button 
                          key={item.id} 
                          onClick={() => setActiveTab(item.id)} 
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-150 group cursor-pointer ${
                            isActive 
                              ? (darkMode ? 'bg-purple-900/40 text-purple-200 font-semibold border border-purple-800/50' : 'bg-purple-50 text-purple-900 font-semibold border border-purple-100') 
                              : (darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800/60 font-medium' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium')
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <item.icon className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive 
                                ? 'text-purple-600' 
                                : (darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-slate-400 group-hover:text-slate-600')
                            }`} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {(item.id === 'inbox' && unreadCount > 0) && (
                              <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                                isActive ? 'bg-purple-600 text-white' : 'bg-rose-500 text-white'
                              }`}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </span>
                            )}
                            {(item.id === 'borrow-requests' && pendingRequestsCount > 0) && (
                              <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                                isActive ? 'bg-purple-600 text-white' : 'bg-purple-600 text-white'
                              }`}>
                                {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>

            {/* Sidebar Bottom Controls */}
            <div className={`p-3 border-t ${darkMode ? 'border-gray-800' : 'border-slate-100'} space-y-1`}>
              <button onClick={() => setDarkMode(!darkMode)} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-slate-600 hover:bg-slate-50'}`}>
                <div className="flex items-center gap-2.5">
                  {darkMode ? <FiSun className="w-4 h-4 text-amber-400" /> : <FiMoon className="w-4 h-4 text-slate-500" />}
                  <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400">{darkMode ? 'Dark' : 'Light'}</span>
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50/70 transition-all duration-150 cursor-pointer group">
                <FiLogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation */}
        <nav 
          aria-label="Mobile Navigation" 
          className={`lg:hidden fixed bottom-0 left-0 right-0 h-16 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } border-t z-40 flex items-center justify-around px-3 shadow-lg`}
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
                    ? 'text-purple-600 font-bold' 
                    : darkMode ? 'text-slate-400 hover:text-slate-200 font-medium' : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-8 h-1 bg-purple-600 rounded-full" />
                )}
                <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-110 text-purple-600' : ''}`} />
                <span className="text-[11px] mt-1 tracking-tight truncate max-w-[100px] text-center">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Main Workspace */}
        <main className="flex-1 min-w-0 lg:ml-64 pb-16 lg:pb-0">
          <GlobalHeader
            userName={userInfo?.firstname || userInfo?.name || 'SHS Librarian'}
            userRole="Senior High School Librarian"
            profileImage={userInfo?.profile_picture || userInfo?.profile_image}
            unreadCount={unreadCount}
            notifications={notifications}
            schoolId={localStorage.getItem('schoolId')}
            books={books}
            schoolInfo={schoolInfo}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onToggleDarkMode={() => setDarkMode(prev => !prev)}
            onOpenStaffModal={() => setShowStaffModal(true)}
            onNotificationClick={handleNotificationClick}
            onProfileClick={handleProfileClick}
            onSettingsClick={handleSettingsClick}
            onLogout={handleLogout}
            onDeleteNotification={handleDeleteNotification}
            onDeleteAllNotifications={handleDeleteAllNotifications}
            darkMode={darkMode}
          />

          {/* SHS Unit Ribbon */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-purple-800/40 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-[10px] font-black uppercase tracking-wider">
                Senior High School Unit
              </span>
              <span className="text-slate-200 text-[11px]">
                Operating as <strong className="text-white font-semibold">{shsLibrary?.name || 'Senior High School Library'}</strong> Desk
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-purple-200">
                {books.length} Books • {studentCount} Registered Students
              </span>
            </div>
          </div>

          <div className="p-4 lg:p-6 min-w-0">
            {activeTab === 'home' && (
              <AdminDashboard 
                darkMode={darkMode} 
                books={books} 
                studentCount={studentCount} 
                unreadCount={unreadCount} 
                onAddStudent={() => setActiveTab('students')} 
                onOpenInbox={() => setActiveTab('inbox')}
                onNavigateToBooks={() => setActiveTab('books')}
                onNavigateToRequests={() => setActiveTab('borrow-requests')}
                onNavigateToOverdue={() => setActiveTab('overdue-books')}
                onNavigateToPartners={() => setActiveTab('borrow-requests')}
                onNavigateToScanner={() => setActiveTab('book-approved')}
                onNavigateToProfile={() => setActiveTab('settings')}
                onNavigateToSettings={() => setActiveTab('settings')}
                onLogout={handleLogout}
              />
            )}
            {activeTab === 'students' && (
              <AdminAddStudent 
                darkMode={darkMode} 
                onNavigateTab={setActiveTab} 
                selectedLibraryId={effectiveLibraryId} 
              />
            )}
            {activeTab === 'list-students' && (
              <AdminListStudents 
                darkMode={darkMode} 
                selectedLibraryId={effectiveLibraryId} 
              />
            )}
            {activeTab === 'borrow-requests' && (
              <AdminBorrowRequests 
                darkMode={darkMode} 
                selectedLibraryId={effectiveLibraryId}
              />
            )}
            {(activeTab === 'book-approved' || activeTab === 'circulation-counter') && (
              <AdminQRScanner 
                darkMode={darkMode} 
                selectedLibraryId={effectiveLibraryId}
              />
            )}
            {activeTab === 'history' && (
              <AdminHistory 
                darkMode={darkMode} 
                selectedLibraryId={effectiveLibraryId}
              />
            )}
            {activeTab === 'overdue-books' && (
              <AdminOverdueBooks 
                darkMode={darkMode} 
                schoolId={localStorage.getItem('schoolId') || schoolInfo?.school_id} 
                librarianId={localStorage.getItem('currentUserId') || localStorage.getItem('userId') || userInfo?.user_id} 
                selectedLibraryId={effectiveLibraryId}
              />
            )}
            {activeTab === 'permission-letter' && (
              <AdminPermissionLetter 
                darkMode={darkMode} 
              />
            )}
            {activeTab === 'books' && (
              <AdminBooks 
                darkMode={darkMode} 
                selectedLibraryId={effectiveLibraryId}
                onNavigateTab={setActiveTab}
              />
            )}
            {activeTab === 'books-management' && (
              <AdminBooksManagement 
                darkMode={darkMode} 
                onNavigateTab={setActiveTab} 
                selectedLibraryId={effectiveLibraryId} 
              />
            )}
            {activeTab === 'inbox' && (
              <AdminInbox 
                darkMode={darkMode} 
              />
            )}
            {activeTab === 'settings' && (
              <AdminSettings 
                darkMode={darkMode} 
              />
            )}
          </div>
        </main>

        {/* Logout Modal */}
        <LogoutConfirmationModal
          show={showLogoutConfirmation}
          onCancel={() => setShowLogoutConfirmation(false)}
          onConfirm={confirmLogout}
          darkMode={darkMode}
          userInfo={userInfo}
          schoolInfo={schoolInfo}
        />

        {/* Staff Modal */}
        {showStaffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FiAward className="w-5 h-5 text-purple-600" />
                  SHS Librarian Counter Details
                </h3>
                <button onClick={() => setShowStaffModal(false)} className="text-slate-400 hover:text-slate-700">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
                  <span className="font-bold text-purple-900 block">{userInfo?.full_name || userInfo?.name || 'SHS Librarian'}</span>
                  <p className="text-purple-700">Assigned Unit: <strong>{shsLibrary?.name || 'Senior High School Library'}</strong></p>
                  <p className="text-slate-500">Institution: {schoolInfo?.school_name}</p>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  You are managing circulation, student registrations, book holdings, and desk operations for the Senior High School Library.
                </p>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 transition shadow-2xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Instant Circulation Scanner (Anywhere / Any Tab) */}
        <GlobalCirculationScanner
          schoolId={schoolInfo?.school_id || localStorage.getItem('schoolId')}
          libraryId={effectiveLibraryId}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
}

export default SHSLibrarianPortal;
