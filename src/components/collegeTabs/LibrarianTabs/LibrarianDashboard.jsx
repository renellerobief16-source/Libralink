import { useState, useEffect } from "react";
import { FiBook, FiUsers, FiBell, FiClock, FiCheckCircle, FiUser, FiChevronDown, FiActivity, FiAlertTriangle, FiArrowRight, FiPlus, FiGrid, FiMail, FiTrendingUp, FiCalendar } from "react-icons/fi";
import { getBorrowRequests, getAllActiveBorrows, getBackendAssetUrl } from "../../../utils/api";
import api from "../../../utils/api";

function AdminDashboard({ books, unreadCount, studentCount = 0, onAddStudent, onOpenInbox, darkMode, onNavigateToBooks, onNavigateToRequests, onNavigateToOverdue, onNavigateToPartners, onNavigateToProfile, onNavigateToSettings, onLogout }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [interlibraryPendingCount, setInterlibraryPendingCount] = useState(0);
  const [borrowedCount, setBorrowedCount] = useState(0);
  const [availableCount, setAvailableCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [weeklyData, setWeeklyData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [partnerLibraries, setPartnerLibraries] = useState([]);
  const [todayStats, setTodayStats] = useState({ borrowed: 0, returned: 0, newStudents: 0 });
  const [lowStockBooks, setLowStockBooks] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const schoolId = localStorage.getItem('schoolId');
    const currentUserId = localStorage.getItem('currentUserId');
    if (!schoolId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        // Fetch school info
        const schoolRes = await api.get(`/schools/${schoolId}`);
        setSchoolInfo(schoolRes.data);

        // Fetch user profile
        if (currentUserId) {
          const userRes = await api.get(`/users/${currentUserId}`);
          setUserProfile(userRes.data);
        }

        const [requests, activeBorrows, overdueRes, interlibraryRes] = await Promise.all([
          getBorrowRequests(schoolId),
          getAllActiveBorrows(schoolId),
          api.get(`/borrow/overdue?school_id=${schoolId}`),
          api.get(`/borrow-requests/partner/${schoolId}`)
        ]);
        
        if (!requests.error && requests.data) {
          setPendingCount(requests.data.filter(r => r.status === 'pending').length);
        }
        if (!interlibraryRes.error && interlibraryRes.data) {
          const pendingInterlibrary = (interlibraryRes.data || []).filter(item => item.status === 'pending').length;
          setInterlibraryPendingCount(pendingInterlibrary);
        }
        if (!activeBorrows.error && activeBorrows.data) {
          setBorrowedCount(activeBorrows.length);
        }
        if (!overdueRes.error && overdueRes.data) {
          setOverdueCount(overdueRes.data.length);
        }

        // Calculate available books
        const available = books.filter(b => b.status === 'available').length;
        setAvailableCount(available);

        // Fetch partner schools with real availability data
        try {
          const partnersRes = await api.get(`/schools/${schoolId}/partners`);
          const partners = (partnersRes.data || []).map(school => ({
            name: school.name,
            available: school.available,
            status: school.status,
            school_id: school.school_id
          }));
          setPartnerLibraries(partners);
        } catch (schoolsError) {
          console.warn('Error fetching partner schools:', schoolsError);
        }

        // Fetch today's statistics
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Today's borrowed count
          const todayBorrows = await api.get('/borrow/history/school', {
            params: { 
              school_id: schoolId,
              start_date: today.toISOString(),
              end_date: new Date().toISOString()
            }
          });
          
          // Today's returned count
          const todayReturns = await api.get('/borrow/returned', {
            params: { 
              school_id: schoolId,
              start_date: today.toISOString(),
              end_date: new Date().toISOString()
            }
          });

          // New students today
          const newStudentsRes = await api.get('/users/school', {
            params: { school_id: schoolId }
          });
          const todayNewStudents = (newStudentsRes.data || []).filter(
            u => new Date(u.created_at) >= today
          ).length;

          setTodayStats({
            borrowed: todayBorrows.data?.length || 0,
            returned: todayReturns.data?.length || 0,
            newStudents: todayNewStudents
          });
        } catch (statsError) {
          console.warn('Error fetching today stats:', statsError);
        }

        // Fetch weekly borrowing data
        try {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          const weeklyBorrows = await api.get('/borrow/history/school', {
            params: { 
              school_id: schoolId,
              start_date: weekAgo.toISOString(),
              end_date: new Date().toISOString()
            }
          });

          // Group by day of week
          const dayCounts = [0, 0, 0, 0, 0, 0, 0];
          (weeklyBorrows.data || []).forEach(borrow => {
            const borrowDate = new Date(borrow.borrow_date || borrow.created_at);
            const dayOfWeek = borrowDate.getDay();
            const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
            dayCounts[adjustedDay]++;
          });
          setWeeklyData(dayCounts);
        } catch (weeklyError) {
          console.warn('Error fetching weekly data:', weeklyError);
        }

        // Find low stock books (less than 2 available copies)
        const lowStock = books.filter(b => {
          const totalCopies = b.total_copies || 1;
          const availableCopies = b.available_copies || 0;
          return totalCopies > 0 && availableCopies < 2;
        }).slice(0, 5);
        setLowStockBooks(lowStock);

        // Fetch recent activities
        try {
          const activitiesRes = await api.get(`/activity-logs/school/${schoolId}?limit=5`);
          // Transform activity logs to match component expectations
          const transformedActivities = (activitiesRes.data || []).map(log => ({
            id: log.log_id,
            type: 'activity',
            action: log.activity,
            details: `${log.users?.firstname} ${log.users?.lastname}`,
            timestamp: log.created_at
          }));
          setRecentActivities(transformedActivities);
        } catch (activityError) {
          console.warn('Activities endpoint not available');
          setRecentActivities([]);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [books]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'borrow':
        return <FiBook className="w-5 h-5 text-[#2563EB]" />;
      case 'return':
        return <FiBook className="w-5 h-5 text-[#16A34A]" />;
      case 'fine':
        return <FiCheckCircle className="w-5 h-5 text-[#DC2626]" />;
      default:
        return <FiActivity className="w-5 h-5 text-[#64748B]" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'borrow':
        return 'bg-blue-100';
      case 'return':
        return 'bg-green-100';
      case 'fine':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxValue = Math.max(...weeklyData);

  return (
    <div className="animate-slide-up">
      {/* Main Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 mb-6 shadow-sm -mt-10">
        {schoolInfo && (
          <div className="inline-flex items-center px-3 py-1 bg-[#F8FAFC] rounded-lg mb-4">
            <span className="text-sm font-semibold text-[#0F172A]">{schoolInfo.school_code || 'SCH'}</span>
          </div>
        )}
        
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-2">
          {getGreeting()}, Librarian! 
        </h1>
        <p className="text-sm sm:text-base text-[#64748B]">
          Here's what's happening in {schoolInfo?.school_name || 'your library'}.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Books */}
        <div className="rounded-2xl p-5 border bg-white border-[#E2E8F0] shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiBook className="w-5 h-5 text-[#2563EB]" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">Total Books</span>
          </div>
          <h3 className="text-3xl font-bold text-[#0F172A]">{loading ? '...' : books.length}</h3>
          <div className="flex items-center gap-4 mt-2">
            <div>
              <p className="text-xs text-[#64748B]">Available</p>
              <p className="text-sm font-semibold text-[#16A34A]">{availableCount}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Borrowed</p>
              <p className="text-sm font-semibold text-[#F59E0B]">{borrowedCount}</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#2563EB] rounded-full transition-all"
              style={{ width: `${books.length > 0 ? (availableCount / books.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Students */}
        <div className="rounded-2xl p-5 border bg-white border-[#E2E8F0] shadow-sm hover:border-green-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FiUsers className="w-5 h-5 text-[#16A34A]" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">Students</span>
          </div>
          <h3 className="text-3xl font-bold text-[#0F172A]">{loading ? '...' : studentCount}</h3>
          <p className="text-sm mt-1 text-[#64748B]">Registered students</p>
        </div>

        {/* Pending Requests */}
        <div className="rounded-2xl p-5 border bg-white border-[#E2E8F0] shadow-sm hover:border-purple-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiBell className="w-5 h-5 text-[#9333EA]" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">Pending Requests</span>
          </div>
          <h3 className="text-3xl font-bold text-[#0F172A]">{loading ? '...' : pendingCount}</h3>
          <p className="text-sm mt-1 text-[#64748B]">Awaiting approval</p>
        </div>

        {/* Overdue Books */}
        <div className="rounded-2xl p-5 border bg-white border-[#E2E8F0] shadow-sm hover:border-red-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <FiAlertTriangle className="w-5 h-5 text-[#DC2626]" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">Overdue Books</span>
          </div>
          <h3 className="text-3xl font-bold text-[#0F172A]">{loading ? '...' : overdueCount}</h3>
          <p className="text-sm mt-1 text-[#DC2626]">Require attention</p>
        </div>
      </div>

      {/* Quick Actions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Quick Actions */}
        <div className="rounded-2xl p-6 border bg-white border-[#E2E8F0] shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[#0F172A]">Quick Actions</h3>
            <p className="text-sm text-[#64748B]">Perform common tasks quickly</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onNavigateToBooks} className="p-4 rounded-xl border transition-all hover:-translate-y-[1px] border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiPlus className="w-5 h-5 text-[#2563EB]" />
                </div>
                <div>
                  <span className="block text-sm font-medium text-[#0F172A]">Add Book</span>
                  <span className="block text-xs text-[#64748B]">New book</span>
                </div>
              </div>
            </button>
            <button onClick={onAddStudent} className="p-4 rounded-xl border transition-all hover:-translate-y-[1px] border-[#E2E8F0] hover:border-[#16A34A] hover:bg-green-50 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiUsers className="w-5 h-5 text-[#16A34A]" />
                </div>
                <div>
                  <span className="block text-sm font-medium text-[#0F172A]">Add Student</span>
                  <span className="block text-xs text-[#64748B]">Register</span>
                </div>
              </div>
            </button>
            <button onClick={onNavigateToBooks} className="p-4 rounded-xl border transition-all hover:-translate-y-[1px] border-[#E2E8F0] hover:border-[#6366F1] hover:bg-indigo-50 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiGrid className="w-5 h-5 text-[#6366F1]" />
                </div>
                <div>
                  <span className="block text-sm font-medium text-[#0F172A]">View Books</span>
                  <span className="block text-xs text-[#64748B]">Browse</span>
                </div>
              </div>
            </button>
            <button onClick={onOpenInbox} className="p-4 rounded-xl border transition-all hover:-translate-y-[1px] border-[#E2E8F0] hover:border-[#9333EA] hover:bg-purple-50 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiMail className="w-5 h-5 text-[#9333EA]" />
                </div>
                <div>
                  <span className="block text-sm font-medium text-[#0F172A]">Inbox</span>
                  <span className="block text-xs text-[#64748B]">Messages</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Alerts */}
        <div className="rounded-2xl p-6 border bg-white border-[#E2E8F0] shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[#0F172A]">Alerts</h3>
            <p className="text-sm text-[#64748B]">Items requiring attention</p>
          </div>
          <div className="space-y-3">
            {overdueCount > 0 && (
              <button onClick={onNavigateToOverdue} className="w-full p-3 rounded-xl border border-[#FEE2E2] bg-red-50 hover:bg-red-100 transition-all flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiAlertTriangle className="w-4 h-4 text-[#DC2626]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-[#0F172A]">{overdueCount} overdue books</p>
                  <p className="text-xs text-[#64748B]">Require immediate attention</p>
                </div>
                <FiArrowRight className="w-4 h-4 text-[#64748B]" />
              </button>
            )}
            {interlibraryPendingCount > 0 && (
              <button onClick={onNavigateToRequests} className="w-full p-3 rounded-xl border border-[#FEF3C7] bg-yellow-50 hover:bg-yellow-100 transition-all flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiBell className="w-4 h-4 text-[#F59E0B]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-[#0F172A]">{interlibraryPendingCount} interlibrary requests</p>
                  <p className="text-xs text-[#64748B]">Awaiting approval</p>
                </div>
                <FiArrowRight className="w-4 h-4 text-[#64748B]" />
              </button>
            )}
            {pendingCount > 0 && (
              <button onClick={onNavigateToRequests} className="w-full p-3 rounded-xl border border-[#FEF3C7] bg-yellow-50 hover:bg-yellow-100 transition-all flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiBell className="w-4 h-4 text-[#F59E0B]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-[#0F172A]">{pendingCount} borrow requests</p>
                  <p className="text-xs text-[#64748B]">Awaiting approval</p>
                </div>
                <FiArrowRight className="w-4 h-4 text-[#64748B]" />
              </button>
            )}
            {lowStockBooks.length > 0 && (
              <button className="w-full p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiBook className="w-4 h-4 text-[#2563EB]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-[#0F172A]">{lowStockBooks.length} book{lowStockBooks.length > 1 ? 's' : ''} with low copies</p>
                  <p className="text-xs text-[#64748B]">Consider restocking</p>
                </div>
                <FiArrowRight className="w-4 h-4 text-[#64748B]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Borrowing Activity Chart */}
      <div className="rounded-2xl p-6 border bg-white border-[#E2E8F0] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-[#0F172A]">Borrowing Activity</h3>
            <p className="text-sm text-[#64748B]">Books borrowed throughout the week</p>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
            <span className="text-sm text-[#0F172A]">This Week</span>
            <FiChevronDown className="w-4 h-4 text-[#64748B]" />
          </button>
        </div>
        <div className="flex items-end justify-between gap-2 h-40">
          {weeklyData.map((value, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex-1 bg-[#F8FAFC] rounded-lg relative overflow-hidden">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-[#2563EB] rounded-lg transition-all duration-500"
                  style={{ height: `${(value / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[#64748B] font-medium">{days[index]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity & Partner Libraries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Activity */}
        <div className="rounded-2xl p-6 border bg-white border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Recent Activity</h3>
              <p className="text-sm text-[#64748B]">Latest library activities</p>
            </div>
            <button onClick={onNavigateToRequests} className="text-sm text-[#2563EB] hover:text-blue-700 font-medium">View All</button>
          </div>
          
          {loading ? (
            <p className="text-sm text-[#64748B]">Loading activities...</p>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <FiActivity className="w-12 h-12 text-[#E2E8F0] mx-auto mb-3" />
              <p className="text-sm text-[#64748B]">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-xl transition-all bg-[#F8FAFC] hover:bg-slate-100"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A]">{activity.action || activity.type}</p>
                    <p className="text-sm text-[#64748B] truncate">{activity.details || activity.description || ''}</p>
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap text-[#64748B]">
                    {activity.timestamp ? formatTimestamp(activity.timestamp) : 'Recently'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Partner Library Availability */}
        <div className="rounded-2xl p-6 border bg-white border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Partner Library Availability</h3>
              <p className="text-sm text-[#64748B]">Books available at partner schools</p>
            </div>
            <button className="text-sm text-[#2563EB] hover:text-blue-700 font-medium">View All</button>
          </div>
          <div className="space-y-3">
            {partnerLibraries.map((library, index) => (
              <div key={index} onClick={onNavigateToPartners} className="p-4 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[#0F172A]">{library.name}</p>
                  <span className="text-xs font-medium text-[#16A34A] bg-green-100 px-2 py-0.5 rounded-full">{library.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">{library.available} books available</span>
                  <FiArrowRight className="w-4 h-4 text-[#64748B]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="rounded-2xl p-6 border bg-white border-[#E2E8F0] shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[#0F172A]">Today's Summary</h3>
          <p className="text-sm text-[#64748B]">Daily library statistics</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#F8FAFC]">
            <div className="flex items-center gap-2 mb-2">
              <FiBook className="w-4 h-4 text-[#2563EB]" />
              <span className="text-xs text-[#64748B]">Borrowed Today</span>
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">{loading ? '...' : todayStats.borrowed}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#F8FAFC]">
            <div className="flex items-center gap-2 mb-2">
              <FiCheckCircle className="w-4 h-4 text-[#16A34A]" />
              <span className="text-xs text-[#64748B]">Returned Today</span>
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">{loading ? '...' : todayStats.returned}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#F8FAFC]">
            <div className="flex items-center gap-2 mb-2">
              <FiUsers className="w-4 h-4 text-[#9333EA]" />
              <span className="text-xs text-[#64748B]">New Students</span>
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">{loading ? '...' : todayStats.newStudents}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#F8FAFC]">
            <div className="flex items-center gap-2 mb-2">
              <FiBell className="w-4 h-4 text-[#F59E0B]" />
              <span className="text-xs text-[#64748B]">Pending Requests</span>
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">{loading ? '...' : pendingCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

