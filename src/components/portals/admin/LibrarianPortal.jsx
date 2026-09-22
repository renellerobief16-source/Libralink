import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiHome, FiMail, FiLogOut, FiBook, FiMoon, FiSun, FiUsers, FiList, 
  FiCheckCircle, FiGrid, FiClock, FiFileText, FiAlertOctagon, FiX, FiShield, FiInfo, FiCheck,
  FiSettings 
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
  LibrarianBooksManagement as AdminBooksManagement,
  LibrarianInbox as AdminInbox,
  LibrarianQRScanner as AdminQRScanner,
  LibrarianHistory as AdminHistory,
  LibrarianFineSettings as AdminFineSettings,
  LibrarianPermissionLetter as AdminPermissionLetter,
  LibrarianOverdueBooks as AdminOverdueBooks,
  LibrarianSettings as AdminSettings,
} from "../../collegeTabs/LibrarianTabs";

function LibrarianPortal() {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState("home");
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

    const fetchSchool = async () => {
      try {
        const res = await api.get(`/schools/${effectiveSchoolId}`);
        setSchoolInfo(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchSchool();
  }, [navigate]);

  useEffect(() => setSchoolLogoError(false), [schoolInfo?.logo]);

  useEffect(() => {
    const load = async () => {
      const schoolId = localStorage.getItem("schoolId");
      if (!schoolId) return;
      try {
        const booksRes = await api.get(`/books/school?school_id=${schoolId}&group=true`);
        const booksList = Array.isArray(booksRes.data) ? booksRes.data : (booksRes.data?.books || []);
        setBooks(booksList);
        const notRes = await getUserNotifications();
        if (notRes.data) {
          setNotifications(notRes.data);
          setUnreadCount(notRes.data.filter((n) => !n.read).length);
        }
        const usersRes = await api.get(`/users/school/${schoolId}`);
        setStudentCount(usersRes.data?.filter((u) => u.role_id === 3).length || 0);
        
        // Get pending borrow requests count
        const borrowRes = await getBorrowRequests(schoolId);
        if (borrowRes.data) {
          setPendingRequestsCount(borrowRes.data.filter(r => r.status === 'pending').length);
        }

        // Fetch user info
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
          setUserInfo(JSON.parse(currentUser));
        }

        // Fetch school borrowing policy
        try {
          const policyRes = await api.get(`/library-settings/policy/${schoolId}`);
          if (policyRes.data?.data) {
            setLibraryPolicy(policyRes.data.data);
          }
        } catch (e) {
          console.warn('Could not fetch library policy:', e);
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  // Reset pending requests count when viewing borrow requests tab
  useEffect(() => {
    if (activeTab === 'borrow-requests') {
      setPendingRequestsCount(0);
    }
  }, [activeTab]);

  const handleLogout = () => setShowLogoutConfirmation(true);
  const confirmLogout = async () => {
    await signOut();
    setShowLogoutConfirmation(false);
    navigate("/login");
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
      // Refresh notifications
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
      // Refresh notifications
      const notRes = await getUserNotifications();
      if (notRes.data) {
        setNotifications(notRes.data);
        setUnreadCount(notRes.data.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const sidebarGroups = [
    {
      title: "Operations",
      items: [
        { id: "home", label: "Dashboard", icon: FiHome },
        { id: "book-approved", label: "Circulation Counter", icon: FiGrid },
        { id: "borrow-requests", label: "Borrow Requests", icon: FiCheckCircle },
      ]
    },
    {
      title: "Collections & Directory",
      items: [
        { id: "books", label: "Book Catalog", icon: FiBook },
        { id: "books-management", label: "Import Books", icon: FiBook },
        { id: "list-students", label: "Students Directory", icon: FiList },
        { id: "students", label: "Register Student", icon: FiUsers },
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

  const flatSidebarItems = sidebarGroups.flatMap(g => g.items);
  const mobileNavItems = flatSidebarItems.slice(0, 4);
  const schoolName = schoolInfo?.school_name || "School";
  const schoolCode = schoolInfo?.school_code || "";

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="flex">
        <aside className={`fixed left-0 top-0 h-full w-64 z-50 hidden lg:block ${darkMode ? 'bg-gray-900 border-r border-gray-800' : 'bg-white border-r border-slate-200/70'}`}>
          <div className="flex flex-col h-full">
            {/* Minimalist Seamless Brand & Campus Header */}
            <div className={`p-5 border-b ${darkMode ? 'border-gray-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <img src="/L.png" alt="Libralink Logo" className="w-8 h-8 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <span className={`text-base font-bold tracking-tight block leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>LibraLink</span>
                  {schoolInfo ? (
                    <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5" title={schoolInfo.school_name}>
                      {schoolInfo.school_name} {schoolInfo.school_code ? `• ${schoolInfo.school_code}` : ''}
                    </p>
                  ) : (
                    <p className="text-[11px] font-medium text-slate-400">Librarian Counter</p>
                  )}
                </div>
              </div>
            </div>

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
                              ? (darkMode ? 'bg-gray-800 text-white font-semibold' : 'bg-slate-100 text-slate-900 font-semibold') 
                              : (darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800/60 font-medium' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium')
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <item.icon className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive 
                                ? 'text-blue-600' 
                                : (darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-slate-400 group-hover:text-slate-600')
                            }`} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {(item.id === 'inbox' && unreadCount > 0) && (
                              <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                                isActive ? 'bg-blue-600 text-white' : 'bg-rose-500 text-white'
                              }`}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </span>
                            )}
                            {(item.id === 'borrow-requests' && pendingRequestsCount > 0) && (
                              <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                                isActive ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'
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

        <div className={`lg:hidden fixed bottom-0 left-0 right-0 h-16 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} z-40 flex items-center justify-around px-4 shadow-sm`}>
          {mobileNavItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 transition-all duration-200 ${activeTab === item.id ? 'text-blue-600' : darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        <main className={`flex-1 min-w-0 lg:ml-64 pb-16 lg:pb-0 overflow-x-hidden`}>
          {/* Sticky Global Header (Adapted from Student Page Header) */}
          <GlobalHeader
            userName={userInfo?.firstname || userInfo?.name || 'Librarian'}
            userRole={localStorage.getItem('userRole')}
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

          {/* Admin Librarian Counter Mode Notice Banner */}
          {(() => {
            const rawRole = (localStorage.getItem("userRole") || '').toLowerCase().replace(/[-_]/g, ' ').trim();
            const roleId = Number(localStorage.getItem("roleId") || 0);
            const isAdminLibrarian = rawRole.includes('admin') || roleId === 2 || roleId === 1;

            if (!isAdminLibrarian) return null;

            return (
              <div className="bg-slate-900 text-white px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-slate-200">
                    <strong className="text-white font-semibold">Circulation Desk Mode Active</strong>
                    <span className="text-slate-400 hidden sm:inline"> — You are operating with Admin Librarian privileges.</span>
                  </span>
                </div>
                <button
                  onClick={() => navigate('/librarian-admin')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
                >
                  <FiShield className="w-3.5 h-3.5 text-blue-200" />
                  <span>Return to Admin Console →</span>
                </button>
              </div>
            );
          })()}

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
            {activeTab === 'students' && <AdminAddStudent darkMode={darkMode} onNavigateTab={setActiveTab} />}
            {activeTab === 'list-students' && <AdminListStudents darkMode={darkMode} />}
            {activeTab === 'borrow-requests' && <AdminBorrowRequests darkMode={darkMode} />}
            {(activeTab === 'book-approved' || activeTab === 'circulation-counter') && <AdminQRScanner darkMode={darkMode} />}
            {activeTab === 'history' && <AdminHistory darkMode={darkMode} />}
            {activeTab === 'overdue-books' && <AdminOverdueBooks darkMode={darkMode} schoolId={localStorage.getItem('schoolId')} librarianId={localStorage.getItem('userId')} />}
            {activeTab === 'permission-letter' && <AdminPermissionLetter darkMode={darkMode} />}
            {activeTab === 'books' && <AdminBooks darkMode={darkMode} />}
            {activeTab === 'books-management' && <AdminBooksManagement darkMode={darkMode} onNavigateTab={setActiveTab} />}
            {activeTab === 'inbox' && <AdminInbox darkMode={darkMode} notifications={notifications} onNavigateTab={setActiveTab} />}
            {activeTab === 'settings' && (
              <AdminSettings 
                darkMode={darkMode} 
                onToggleDarkMode={() => setDarkMode(prev => !prev)} 
                userInfo={userInfo} 
                schoolInfo={schoolInfo} 
                onNavigateTab={setActiveTab} 
              />
            )}
          </div>
        </main>

        <LogoutConfirmationModal
          show={showLogoutConfirmation}
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutConfirmation(false)}
          darkMode={darkMode}
          userInfo={userInfo}
          schoolInfo={schoolInfo}
        />

        {/* Staff Profile & Institutional Library Policy Modal */}
        {showStaffModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col animate-scale-up overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
                    <FiShield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Staff Profile & Library Policy</h3>
                    <p className="text-xs text-slate-500">
                      Active operational credentials and circulation rules for {schoolInfo?.school_name || 'Library'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Staff Credentials Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">
                    Librarian Account Details
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-slate-400 block">Staff Name</span>
                      <span className="font-semibold text-slate-800">
                        {userInfo?.firstname} {userInfo?.lastname || ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">System Role</span>
                      <span className="font-semibold text-blue-600 capitalize">
                        {localStorage.getItem('userRole') || 'Librarian'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">School Library</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {schoolInfo?.school_name || 'Assigned School'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">School Code</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {schoolInfo?.school_code || 'SCH'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Library Circulation Policy */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FiInfo className="w-4 h-4 text-blue-600" />
                      Active Circulation Lending Policy
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">
                      Consortium Rules
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-slate-200 bg-white">
                      <span className="text-[11px] text-slate-500 block">Max Borrow Limit</span>
                      <span className="text-lg font-bold text-slate-900">
                        {libraryPolicy?.max_borrow_limit ?? 3} books
                      </span>
                      <span className="text-[10px] text-slate-400 block">Per student</span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-white">
                      <span className="text-[11px] text-slate-500 block">Local Loan Period</span>
                      <span className="text-lg font-bold text-slate-900">
                        {libraryPolicy?.home_borrowing_days ?? 7} days
                      </span>
                      <span className="text-[10px] text-slate-400 block">Home students</span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-white">
                      <span className="text-[11px] text-slate-500 block">Inter-School Loan</span>
                      <span className="text-lg font-bold text-slate-900">
                        {libraryPolicy?.inter_school_borrowing_days ?? 14} days
                      </span>
                      <span className="text-[10px] text-slate-400 block">Partner schools</span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-white">
                      <span className="text-[11px] text-slate-500 block">Daily Late Fine</span>
                      <span className="text-lg font-bold text-slate-900">
                        {libraryPolicy?.enable_fines !== false ? `₱${libraryPolicy?.fine_amount_per_day ?? 5}` : 'Free'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Per day overdue</span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-white">
                      <span className="text-[11px] text-slate-500 block">Grace Period</span>
                      <span className="text-lg font-bold text-slate-900">
                        {libraryPolicy?.grace_period_days ?? 0} days
                      </span>
                      <span className="text-[10px] text-slate-400 block">Before fines apply</span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-white">
                      <span className="text-[11px] text-slate-500 block">Renewals</span>
                      <span className="text-lg font-bold text-slate-900">
                        {libraryPolicy?.allow_renewals ? `${libraryPolicy?.max_renewals_per_book ?? 1}x` : 'Disabled'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Max per item</span>
                    </div>
                  </div>
                </div>

                {/* Operations Note */}
                <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/60 text-xs text-blue-900 flex items-start gap-2.5">
                  <FiCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p>
                    These lending rules are automatically enforced when issuing loans, verifying digital QR passes, and computing late fees at the Circulation Counter.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LibrarianPortal;
