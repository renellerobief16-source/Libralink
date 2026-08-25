import { useState, useEffect } from "react";
import { Book, Clock, Users, AlertTriangle, Search, Calendar, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  WelcomeSection,
  StatsCard,
  BorrowedBooks,
  CalendarWidget,
  AnnouncementsWidget,
} from "./StudentDashboardComponents";
import api from "../../../utils/api";
import { StatsCardSkeleton } from "../../ui/Skeleton";

function StudentHome({ bookCount = 0, studentCount = 0, schoolInfo }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('Student');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [dueSoonCount, setDueSoonCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileImage, setProfileImage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userStr = localStorage.getItem('currentUser');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const currentUserId = localStorage.getItem('currentUserId');
        const schoolId = localStorage.getItem('schoolId');

        if (currentUser) {
          const firstName = currentUser?.first_name || currentUser?.name || 'Student';
          setDisplayName(firstName);
          const profilePic = currentUser?.profile_picture || currentUser?.profile_image || '';
          setProfileImage(profilePic);
        }

        if (currentUserId && schoolId) {
          // Fetch borrowed books for current student
          try {
            const borrowRes = await api.get(`/borrow/student/${currentUserId}`);
            if (borrowRes.data) {
              const books = borrowRes.data.map(borrow => {
                const dueDate = new Date(borrow.due_date);
                const today = new Date();
                const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                
                let status = 'onTime';
                if (daysDiff < 0) status = 'overdue';
                else if (daysDiff <= 3) status = 'dueSoon';

                return {
                  id: borrow.borrow_id,
                  title: borrow.book_title || borrow.title || 'Unknown Book',
                  author: borrow.author || 'Unknown Author',
                  dueDate: borrow.due_date,
                  dueIn: daysDiff < 0 ? `${Math.abs(daysDiff)} days overdue` : 
                        daysDiff === 0 ? 'Due today' : 
                        daysDiff === 1 ? 'Due tomorrow' : 
                        `${daysDiff} days`,
                  status: status,
                  borrowId: borrow.borrow_id
                };
              });
              setBorrowedBooks(books);
              setDueSoonCount(books.filter(b => b.status === 'dueSoon').length);
              setOverdueCount(books.filter(b => b.status === 'overdue').length);
            }
          } catch (borrowError) {
            console.error('Error fetching borrowed books:', borrowError);
          }

          // Fetch announcements
          try {
            const announcementsRes = await api.get(`/announcements/school/${schoolId}`);
            if (announcementsRes.data) {
              setAnnouncements(announcementsRes.data.map(ann => ({
                id: ann.announcement_id,
                title: ann.title,
                message: ann.message || ann.content,
                date: ann.created_at ? new Date(ann.created_at).toLocaleDateString() : 'Recent'
              })));
            }
          } catch (annError) {
            console.error('Error fetching announcements:', annError);
          }

          // Fetch notifications
          try {
            const notifRes = await api.get(`/notifications/user/${currentUserId}`);
            if (notifRes.data) {
              setNotifications(notifRes.data);
              setUnreadCount(notifRes.data.filter(n => !n.read).length);
            }
          } catch (notifError) {
            console.error('Error fetching notifications:', notifError);
          }
        }
      } catch (err) {
        console.error('Error loading user info:', err);
      } finally {
        setLoading(false);
        setStatsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleBooksClick = () => {
    navigate('/studentpage/search');
  };

  const handleBorrowedClick = () => {
    navigate('/studentpage/history');
  };

  const handleDueSoonClick = () => {
    navigate('/studentpage/history');
  };

  const handleStudentsClick = () => {
    alert('Student directory feature coming soon!');
  };

  const handleSearchClick = () => {
    navigate('/studentpage/search');
  };

  const handleNotificationsClick = () => {
    navigate('/studentpage/notifications');
  };

  const handleRenewBook = async (borrowId) => {
    try {
      await api.put(`/borrow/${borrowId}/renew`);
      // Refresh borrowed books
      const currentUserId = localStorage.getItem('currentUserId');
      const borrowRes = await api.get(`/borrow/student/${currentUserId}`);
      if (borrowRes.data) {
        const books = borrowRes.data.map(borrow => {
          const dueDate = new Date(borrow.due_date);
          const today = new Date();
          const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          
          let status = 'onTime';
          if (daysDiff < 0) status = 'overdue';
          else if (daysDiff <= 3) status = 'dueSoon';

          return {
            id: borrow.borrow_id,
            title: borrow.book_title || borrow.title || 'Unknown Book',
            author: borrow.author || 'Unknown Author',
            dueDate: borrow.due_date,
            dueIn: daysDiff < 0 ? `${Math.abs(daysDiff)} days overdue` : 
                  daysDiff === 0 ? 'Due today' : 
                  daysDiff === 1 ? 'Due tomorrow' : 
                  `${daysDiff} days`,
            status: status,
            borrowId: borrow.borrow_id
          };
        });
        setBorrowedBooks(books);
        setDueSoonCount(books.filter(b => b.status === 'dueSoon').length);
        setOverdueCount(books.filter(b => b.status === 'overdue').length);
      }
      alert('Book renewed successfully!');
    } catch (error) {
      console.error('Error renewing book:', error);
      alert('Failed to renew book. Please try again.');
    }
  };

  return (
    <div className="animate-slide-up space-y-6">
      <WelcomeSection displayName={displayName} schoolInfo={schoolInfo} profileImage={profileImage} />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={handleSearchClick}
          className="flex flex-col items-center gap-2 p-4 sm:p-5 min-h-[100px] bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
          aria-label="Search books"
        >
          <Search className="w-6 h-6 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Search Books</span>
        </button>
        <button
          onClick={handleBorrowedClick}
          className="flex flex-col items-center gap-2 p-4 sm:p-5 min-h-[100px] bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
          aria-label="View my books"
        >
          <Clock className="w-6 h-6 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">My Books</span>
        </button>
        <button
          onClick={handleNotificationsClick}
          className="flex flex-col items-center gap-2 p-4 sm:p-5 min-h-[100px] bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all relative active:scale-[0.98]"
          aria-label="View notifications"
        >
          <Bell className="w-6 h-6 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" aria-label={`${unreadCount} unread notifications`}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/studentpage/profile')}
          className="flex flex-col items-center gap-2 p-4 sm:p-5 min-h-[100px] bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
          aria-label="View profile"
        >
          <Users className="w-6 h-6 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Profile</span>
        </button>
      </div>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">You have {overdueCount} overdue book{overdueCount > 1 ? 's' : ''}</p>
            <p className="text-sm text-red-700">Please return or renew them as soon as possible to avoid fines.</p>
          </div>
          <button
            onClick={handleBorrowedClick}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium active:scale-[0.98]"
            aria-label="View overdue book details"
          >
            View Details
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statsLoading ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : (
              <>
                <StatsCard icon={Book} title="Books" value={bookCount || 0} subtitle="Total Books" color="blue" onClick={handleBooksClick} />
                <StatsCard icon={Users} title="Students" value={studentCount || 0} subtitle="Total Students" color="blue" onClick={handleStudentsClick} />
                <StatsCard icon={Clock} title="Borrowed" value={borrowedBooks.length} subtitle="Currently Borrowed" color="blue" onClick={handleBorrowedClick} />
                <StatsCard icon={AlertTriangle} title="Overdue" value={overdueCount} subtitle="Overdue Books" color="red" onClick={handleBorrowedClick} />
              </>
            )}
          </div>

          <BorrowedBooks books={borrowedBooks} onRenew={handleRenewBook} />
        </div>

        <div className="space-y-6">
          <CalendarWidget borrowedBooks={borrowedBooks} />
          <AnnouncementsWidget announcements={announcements} />
        </div>
      </div>
    </div>
  );
}

export default StudentHome;
