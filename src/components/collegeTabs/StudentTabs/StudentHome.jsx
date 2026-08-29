import { useState, useEffect } from "react";
import { Book, Clock, Users, AlertTriangle, Search, Bell, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  WelcomeSection,
  StatsCard,
  BorrowedBooks,
  CalendarWidget,
  AnnouncementsWidget,
} from "./StudentDashboardComponents";
import api, { API_ORIGIN } from "../../../utils/api";
import { StatsCardSkeleton } from "../../ui/Skeleton";

function SchoolAvatar({ schoolName, logo }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = schoolName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();

  return (
    <span className="flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 p-[2px] shadow-sm">
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white p-1">
        {logo && !imageFailed ? (
          <img src={logo} alt={`${schoolName} logo`} className="h-full w-full rounded-full object-contain" onError={() => setImageFailed(true)} />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">{initials}</span>
        )}
      </span>
    </span>
  );
}

function StudentHome({ bookCount = 0, schoolInfo }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('Student');
  const [statsLoading, setStatsLoading] = useState(true);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [dueSoonCount, setDueSoonCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileImage, setProfileImage] = useState('');
  const [partnerSchools, setPartnerSchools] = useState([]);

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
              setUnreadCount(notifRes.data.filter(n => !n.read).length);
            }
          } catch (notifError) {
            console.error('Error fetching notifications:', notifError);
          }

          // All schools registered in Libralink, shown in the dashboard school carousel.
          try {
            const partnersRes = await api.get('/schools');
            setPartnerSchools(partnersRes.data?.data || partnersRes.data || []);
          } catch (partnersError) {
            console.error('Error fetching registered schools:', partnersError);
          }
        }
      } catch (err) {
        console.error('Error loading user info:', err);
      } finally {
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
    <div className="animate-slide-up space-y-5 sm:space-y-6">
      {partnerSchools.length > 0 && (
        <section aria-labelledby="partner-schools-title" className="-mx-3 overflow-hidden border-y border-slate-100 bg-white py-4 sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
          <div className="mb-3 flex items-center justify-between px-3 sm:px-0">
            <div>
              <h2 id="partner-schools-title" className="text-sm font-bold text-slate-900">Schools on Libralink</h2>
              <p className="text-xs text-slate-500">Explore all registered school libraries</p>
            </div>
            <button onClick={handleSearchClick} className="text-xs font-semibold text-blue-600 active:text-blue-800">Explore</button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:px-0">
            {partnerSchools.map((school) => {
              const logo = school.logo && (school.logo.startsWith('http') || school.logo.startsWith('data:') ? school.logo : `${API_ORIGIN}${school.logo.startsWith('/') ? '' : '/'}${school.logo}`);
              const schoolName = school.school_name || school.name || 'School';
              return (
                <button key={school.school_id} onClick={handleSearchClick} className="flex w-[74px] shrink-0 flex-col items-center gap-1.5 text-center active:scale-95" aria-label={`Browse books from ${schoolName}`}>
                  <SchoolAvatar schoolName={schoolName} logo={logo} />
                  <span className="w-full truncate text-[11px] font-medium text-slate-700">{schoolName}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <WelcomeSection displayName={displayName} schoolInfo={schoolInfo} profileImage={profileImage} onBrowse={handleSearchClick} />

      {/* Quick Actions */}
      <section aria-label="Quick actions">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">Library tools</p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">What would you like to do?</h2>
          </div>
          <span className="hidden text-xs font-medium text-slate-500 sm:block">One tap to continue</span>
        </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={handleSearchClick}
          className="relative flex min-h-[112px] flex-col items-start gap-2 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left shadow-sm transition-all active:scale-[0.98] sm:items-center sm:p-5 sm:text-center"
          aria-label="Search books"
        >
          <Search className="w-6 h-6 text-blue-600" />
          <span className="text-sm font-semibold text-slate-800">Find a book</span>
          <ArrowUpRight className="absolute bottom-3 right-3 h-4 w-4 text-blue-500" aria-hidden="true" />
        </button>
        <button
          onClick={handleBorrowedClick}
          className="relative flex min-h-[112px] flex-col items-start gap-2 overflow-hidden rounded-2xl border border-violet-100 bg-violet-50 p-4 text-left shadow-sm transition-all active:scale-[0.98] sm:items-center sm:p-5 sm:text-center"
          aria-label="View my books"
        >
          <Clock className="w-6 h-6 text-violet-600" />
          <span className="text-sm font-semibold text-slate-800">My books</span>
          <ArrowUpRight className="absolute bottom-3 right-3 h-4 w-4 text-violet-500" aria-hidden="true" />
        </button>
        <button
          onClick={handleNotificationsClick}
          className="relative flex min-h-[112px] flex-col items-start gap-2 overflow-hidden rounded-2xl border border-amber-100 bg-amber-50 p-4 text-left shadow-sm transition-all active:scale-[0.98] sm:items-center sm:p-5 sm:text-center"
          aria-label="View notifications"
        >
          <Bell className="w-6 h-6 text-amber-600" />
          <span className="text-sm font-semibold text-slate-800">Updates</span>
          <ArrowUpRight className="absolute bottom-3 right-3 h-4 w-4 text-amber-500" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" aria-label={`${unreadCount} unread notifications`}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/studentpage/profile')}
          className="relative flex min-h-[112px] flex-col items-start gap-2 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left shadow-sm transition-all active:scale-[0.98] sm:items-center sm:p-5 sm:text-center"
          aria-label="View profile"
        >
          <Users className="w-6 h-6 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-800">My profile</span>
          <ArrowUpRight className="absolute bottom-3 right-3 h-4 w-4 text-emerald-500" aria-hidden="true" />
        </button>
      </div>
      </section>

      <section aria-labelledby="library-status-title">
        <div className="mb-3 flex items-end justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">My activity</p><h2 id="library-status-title" className="mt-0.5 text-lg font-bold text-slate-900">Library at a glance</h2></div><button onClick={handleBorrowedClick} className="text-xs font-semibold text-blue-600">View history</button></div>
        <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <button onClick={handleBorrowedClick} className="min-w-0 border-r border-slate-100 px-3 py-4 text-left active:bg-slate-50"><div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50"><Book className="h-4 w-4 text-blue-600" /></div><p className="text-2xl font-bold text-slate-900">{borrowedBooks.length}</p><p className="mt-1 text-[11px] font-medium text-slate-500">On loan</p></button>
          <button onClick={handleDueSoonClick} className="min-w-0 border-r border-slate-100 px-3 py-4 text-left active:bg-slate-50"><div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50"><Clock className="h-4 w-4 text-amber-600" /></div><p className="text-2xl font-bold text-amber-600">{dueSoonCount}</p><p className="mt-1 text-[11px] font-medium text-slate-500">Due soon</p></button>
          <button onClick={handleBorrowedClick} className="min-w-0 px-3 py-4 text-left active:bg-slate-50"><div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${overdueCount ? 'bg-rose-50' : 'bg-emerald-50'}`}><AlertTriangle className={`h-4 w-4 ${overdueCount ? 'text-rose-600' : 'text-emerald-600'}`} /></div><p className={`text-2xl font-bold ${overdueCount ? 'text-rose-600' : 'text-emerald-600'}`}>{overdueCount}</p><p className="mt-1 text-[11px] font-medium text-slate-500">Overdue</p></button>
        </div>
      </section>

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
          <div className="hidden grid-cols-2 gap-3 sm:gap-4 md:grid xl:grid-cols-4">
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
                <StatsCard icon={Clock} title="Due soon" value={dueSoonCount} subtitle="Return date approaching" color="orange" onClick={handleDueSoonClick} />
                <StatsCard icon={Clock} title="Borrowed" value={borrowedBooks.length} subtitle="Currently Borrowed" color="blue" onClick={handleBorrowedClick} />
                <StatsCard icon={AlertTriangle} title="Overdue" value={overdueCount} subtitle="Overdue Books" color="red" onClick={handleBorrowedClick} />
              </>
            )}
          </div>

          <BorrowedBooks books={borrowedBooks} onRenew={handleRenewBook} onViewAll={handleBorrowedClick} />
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
