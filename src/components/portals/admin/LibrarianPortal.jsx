import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiHome, FiMail, FiLogOut, FiBook, FiMoon, FiSun, FiUsers, FiList, FiCheckCircle, FiGrid, FiClock, FiFileText, FiAlertOctagon } from "react-icons/fi";
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
        setBooks(booksRes.data || []);
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
    // Librarian doesn't have a separate profile tab, could navigate to settings or show alert
    alert('Profile feature coming soon');
  };

  const handleSettingsClick = () => {
    alert('Settings feature coming soon');
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

  const sidebarItems = [
    { id: "home", label: "Dashboard", icon: FiHome },
    { id: "borrow-requests", label: "Borrow Requests", icon: FiCheckCircle },
    { id: "book-approved", label: "Book Approved", icon: FiGrid },
    { id: "students", label: "Add Student", icon: FiUsers },
    { id: "list-students", label: "List of Student", icon: FiList },
    { id: "books", label: "Books", icon: FiBook },
    { id: "books-management", label: "Import Books", icon: FiBook },
    { id: "overdue-books", label: "Overdue Books", icon: FiAlertOctagon },
    { id: "history", label: "History", icon: FiClock },
    { id: "permission-letter", label: "Permission Letter", icon: FiFileText },
    { id: "inbox", label: "Inbox", icon: FiMail },
  ];

  const mobileNavItems = sidebarItems.slice(0, 4);
  const schoolName = schoolInfo?.school_name || "School";
  const schoolCode = schoolInfo?.school_code || "";

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="flex">
        <aside className={`fixed left-0 top-0 h-full w-64 z-50 hidden lg:block ${darkMode ? 'bg-gray-800 border-r border-gray-700' : 'bg-white border-r border-gray-200'}`}>
          <div className="flex flex-col h-full">
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <img src="/L.png" alt="Libralink Logo" className="w-9 h-9 rounded-lg object-cover" />
                <div>
                  <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>LibraLink</span>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Librarian</p>
                </div>
              </div>
            </div>

            {schoolInfo && (
              <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider mb-1`}>Current School</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center overflow-hidden">
                    {schoolInfo.logo && !schoolLogoError ? (
                      <img src={getBackendAssetUrl(schoolInfo.logo)} alt={`${schoolInfo.school_name} Logo`} className="w-full h-full object-contain" onError={() => setSchoolLogoError(true)} />
                    ) : (
                      <FiGrid className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} text-sm`}>{schoolInfo.school_name}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{schoolInfo.school_code}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-4 px-3">
              <nav className="space-y-1">
                {sidebarItems.map((item) => (
                  <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 group relative ${activeTab === item.id ? (darkMode ? 'text-white font-semibold bg-gray-700 border-l-2 border-blue-500' : 'text-gray-900 font-semibold bg-slate-50 border-l-2 border-blue-600') : (darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50')}`}>
                    <div className="relative flex-shrink-0">
                      <item.icon className={`w-5 h-5 ${activeTab === item.id ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-gray-500 group-hover:text-gray-400' : 'text-gray-400 group-hover:text-gray-500')}`} />
                      {(item.id === 'inbox' && unreadCount > 0) && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">{unreadCount > 9 ? '9+' : unreadCount}</span>
                      )}
                      {(item.id === 'borrow-requests' && pendingRequestsCount > 0) && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">{pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}</span>
                      )}
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </nav>
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

        <div className={`lg:hidden fixed top-0 left-0 right-0 h-16 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} z-40 flex items-center justify-between px-4 shadow-sm`}>
          <div className="flex items-center gap-3">
            <img src="/L.png" alt="Libralink Logo" className="w-8 h-8 rounded-full object-cover shadow-sm" />
            <span className="text-lg font-bold text-gray-900">LibraLink</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}>{darkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}</button>
            <button onClick={handleLogout} className="p-2 rounded-lg text-red-500 hover:bg-red-50"><FiLogOut className="w-5 h-5" /></button>
          </div>
        </div>

        <div className={`lg:hidden fixed bottom-0 left-0 right-0 h-16 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} z-40 flex items-center justify-around px-4 shadow-sm`}>
          {mobileNavItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 transition-all duration-200 ${activeTab === item.id ? 'text-blue-600' : darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        <main className={`flex-1 lg:ml-64 pt-16 lg:pt-0 pb-16 lg:pb-0`}>
          {/* Global Header */}
          <GlobalHeader
            userName={userInfo?.firstname || userInfo?.name || 'Librarian'}
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
                onNavigateToProfile={() => alert('Profile feature coming soon')}
                onNavigateToSettings={() => alert('Settings feature coming soon')}
                onLogout={handleLogout}
              />
            )}
            {activeTab === 'students' && <AdminAddStudent darkMode={darkMode} />}
            {activeTab === 'list-students' && <AdminListStudents darkMode={darkMode} />}
            {activeTab === 'borrow-requests' && <AdminBorrowRequests darkMode={darkMode} />}
            {activeTab === 'book-approved' && <AdminQRScanner darkMode={darkMode} />}
            {activeTab === 'history' && <AdminHistory darkMode={darkMode} />}
            {activeTab === 'overdue-books' && <AdminOverdueBooks darkMode={darkMode} schoolId={localStorage.getItem('schoolId')} librarianId={localStorage.getItem('userId')} />}
            {activeTab === 'permission-letter' && <AdminPermissionLetter darkMode={darkMode} />}
            {activeTab === 'books' && <AdminBooks darkMode={darkMode} />}
            {activeTab === 'books-management' && <AdminBooksManagement darkMode={darkMode} />}
            {activeTab === 'inbox' && <AdminInbox darkMode={darkMode} notifications={notifications} />}
          </div>
        </main>

        <ConfirmationOverlay show={showLogoutConfirmation} title="Confirm Logout" message="Are you sure you want to log out? You will be returned to the login page." onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirmation(false)} />
      </div>
    </div>
  );
}

export default LibrarianPortal;
