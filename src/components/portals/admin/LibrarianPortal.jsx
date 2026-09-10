import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiHome, FiMail, FiLogOut, FiBook, FiMoon, FiSun, FiUsers, FiList, 
  FiCheckCircle, FiGrid, FiClock, FiFileText, FiAlertOctagon, FiX, FiShield, FiInfo, FiCheck 
} from "react-icons/fi";
import { getUserNotifications, getBackendAssetUrl, signOut, getBorrowRequests } from "../../../utils/api";
import api from "../../../utils/api";
import { ConfirmationOverlay, GlobalHeader } from "../../common";
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
    const userRole = localStorage.getItem("userRole");
    const schoolId = localStorage.getItem("schoolId");
    if (userRole !== "librarian" || !schoolId) {
      navigate("/login");
      return;
    }

    const fetchSchool = async () => {
      try {
        const res = await api.get(`/schools/${schoolId}`);
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
        const booksRes = await api.get(`/books/school?school_id=${schoolId}`);
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
    setShowStaffModal(true);
  };

  const handleSettingsClick = () => {
    setShowStaffModal(true);
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
    }
  ];

  const flatSidebarItems = sidebarGroups.flatMap(g => g.items);
  const mobileNavItems = flatSidebarItems.slice(0, 4);
  const schoolName = schoolInfo?.school_name || "School";
  const schoolCode = schoolInfo?.school_code || "";

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="flex">
        <aside className={`fixed left-0 top-0 h-full w-64 z-50 hidden lg:block ${darkMode ? 'bg-gray-800 border-r border-gray-700' : 'bg-white border-r border-gray-200'}`}>
          <div className="flex flex-col h-full">
            <div className={`p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <img src="/L.png" alt="Libralink Logo" className="w-9 h-9 rounded-xl object-cover shadow-sm" />
                <div>
                  <span className={`text-lg font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>LibraLink</span>
                  <p className={`text-[11px] font-semibold text-blue-600`}>Librarian Counter</p>
                </div>
              </div>
            </div>

            {schoolInfo && (
              <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <p className={`text-[10px] font-bold ${darkMode ? 'text-gray-400' : 'text-gray-400'} uppercase tracking-wider mb-1`}>Assigned Campus</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {schoolInfo.logo && !schoolLogoError ? (
                      <img src={getBackendAssetUrl(schoolInfo.logo)} alt={`${schoolInfo.school_name} Logo`} className="w-full h-full object-contain" onError={() => setSchoolLogoError(true)} />
                    ) : (
                      <FiGrid className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} text-xs truncate`}>{schoolInfo.school_name}</div>
                    <div className={`text-[10px] font-mono ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{schoolInfo.school_code}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
              {sidebarGroups.map((group, gIdx) => (
                <div key={gIdx}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
                    {group.title}
                  </div>
                  <nav className="space-y-0.5">
                    {group.items.map((item) => (
                      <button 
                        key={item.id} 
                        onClick={() => setActiveTab(item.id)} 
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group relative ${
                          activeTab === item.id 
                            ? (darkMode ? 'text-white bg-blue-600 shadow-sm' : 'text-blue-700 bg-blue-50/90 border border-blue-100') 
                            : (darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <item.icon className={`w-4 h-4 ${
                            activeTab === item.id 
                              ? (darkMode ? 'text-white' : 'text-blue-600') 
                              : (darkMode ? 'text-gray-400' : 'text-slate-400 group-hover:text-slate-600')
                          }`} />
                          {(item.id === 'inbox' && unreadCount > 0) && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                          {(item.id === 'borrow-requests' && pendingRequestsCount > 0) && (
                            <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                              {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                            </span>
                          )}
                        </div>
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              ))}
            </div>

            <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <button onClick={() => setDarkMode(!darkMode)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 mb-2 ${darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'}`}>
                {darkMode ? <FiSun className="w-5 h-5 text-gray-400" /> : <FiMoon className="w-5 h-5 text-gray-400" />}
                <span className="text-sm">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 ${darkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'}`}>
                <FiLogOut className="w-5 h-5" />
                <span className="text-sm">Logout</span>
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

        <main className={`flex-1 lg:ml-64 pb-16 lg:pb-0`}>
          {/* Sticky Global Header (Adapted from Student Page Header) */}
          <GlobalHeader
            userName={userInfo?.firstname || userInfo?.name || 'Librarian'}
            userRole={localStorage.getItem('userRole')}
            profileImage={userInfo?.profile_picture}
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

          <div className="p-6 lg:p-8">
            <div className="mb-8">
            </div>

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
                onNavigateToProfile={() => setShowStaffModal(true)}
                onNavigateToSettings={() => setShowStaffModal(true)}
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
          </div>
        </main>

        <ConfirmationOverlay show={showLogoutConfirmation} title="Confirm Logout" message="Are you sure you want to log out? You will be returned to the login page." onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirmation(false)} />

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
