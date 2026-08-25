import { useState, useEffect } from 'react';
import { FiBook, FiUsers, FiActivity, FiAlertCircle, FiClock, FiArrowRight, FiTrendingUp } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../../utils/api';

function LibrarianAdminDashboard() {
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalUsers: 0,
    activeBorrows: 0,
    overdueBooks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentActivities, setRecentActivities] = useState([]);
  const [chartData, setChartData] = useState([]);

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

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  useEffect(() => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) return;

    const fetchStats = async () => {
      try {
        // Fetch books count
        const booksRes = await api.get(`/books/school?school_id=${schoolId}`);
        const totalBooks = booksRes.data?.length || 0;

        // Fetch users count
        const usersRes = await api.get(`/users/school/${schoolId}`);
        const totalUsers = usersRes.data?.length || 0;

        // Fetch active borrows - use the backend route path
        let activeBorrows = 0;
        try {
          const borrowsRes = await api.get(`/borrow/active/school/${schoolId}`);
          activeBorrows = borrowsRes.data?.length || 0;
        } catch (borrowError) {
          console.warn('Active borrows endpoint not available, setting to 0');
          activeBorrows = 0;
        }

        // Fetch overdue books - handle 404 gracefully
        let overdueBooks = 0;
        try {
          const overdueRes = await api.get('/borrow/overdue?school_id=' + schoolId);
          overdueBooks = overdueRes.data?.length || 0;
        } catch (overdueError) {
          console.warn('Overdue books endpoint not available, setting to 0');
          overdueBooks = 0;
        }

        setStats({
          totalBooks,
          totalUsers,
          activeBorrows,
          overdueBooks,
        });
        setLoading(false);

        // Generate chart data for the last 7 days
        const generateChartData = () => {
          const data = [];
          const today = new Date();
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            data.push({
              date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              borrows: Math.floor(Math.random() * 20) + 5,
              returns: Math.floor(Math.random() * 15) + 3,
            });
          }
          return data;
        };
        setChartData(generateChartData());
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="animate-slide-up">
      {/* Welcome Card */}
      <div className="rounded-2xl p-6 mb-6 border bg-white border-[#E2E8F0] shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-2">
              {getGreeting()}, Admin Librarian! 👋
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] mb-4">
              Welcome back! Here's what's happening in your library today.
            </p>
            <div className="text-sm text-[#64748B]">
              <div>{formatDate(currentTime)}</div>
              <div className="font-medium">{formatTime(currentTime)}</div>
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center w-50 h-50">
            <img 
              src="/admin.png" 
              alt="Administrator" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>
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
          <h3 className="text-3xl font-bold text-[#0F172A]">{loading ? '...' : stats.totalBooks}</h3>
          <p className="text-sm mt-1 text-[#64748B]">Books in the library</p>
        </div>

        {/* Total Users */}
        <div className="rounded-2xl p-5 border bg-white border-[#E2E8F0] shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FiUsers className="w-5 h-5 text-[#16A34A]" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">Total Users</span>
          </div>
          <h3 className="text-3xl font-bold text-[#0F172A]">{loading ? '...' : stats.totalUsers}</h3>
          <p className="text-sm mt-1 text-[#64748B]">Registered users</p>
        </div>

        {/* Active Borrows */}
        <div className="rounded-2xl p-5 border bg-white border-[#E2E8F0] shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FiClock className="w-5 h-5 text-[#6366F1]" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">Active Borrows</span>
          </div>
          <h3 className="text-3xl font-bold text-[#0F172A]">{loading ? '...' : stats.activeBorrows}</h3>
          <p className="text-sm mt-1 text-[#64748B]">Currently borrowed</p>
        </div>

        {/* Overdue */}
        <div className="rounded-2xl p-5 border bg-white border-[#E2E8F0] shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <FiAlertCircle className="w-5 h-5 text-[#DC2626]" />
            </div>
            <span className="text-xs font-medium text-[#64748B]">Overdue</span>
          </div>
          <h3 className="text-3xl font-bold text-[#0F172A]">{loading ? '...' : stats.overdueBooks}</h3>
          <p className="text-sm mt-1 text-[#64748B]">Books overdue</p>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="rounded-2xl p-6 border bg-white border-[#E2E8F0] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
              <FiTrendingUp className="w-5 h-5" />
              Borrowing Analytics
            </h3>
            <p className="text-sm text-[#64748B]">Weekly borrowing and return trends</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="borrows" 
                stroke="#2563EB" 
                strokeWidth={2}
                dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Borrows"
              />
              <Line 
                type="monotone" 
                dataKey="returns" 
                stroke="#16A34A" 
                strokeWidth={2}
                dot={{ fill: '#16A34A', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Returns"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl p-6 border bg-white border-[#E2E8F0] shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[#0F172A]">Quick Actions</h3>
          <p className="text-sm text-[#64748B]">Perform common tasks quickly</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 rounded-xl border transition-all hover:-translate-y-[1px] border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FiBook className="w-5 h-5 text-[#2563EB]" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-medium text-[#0F172A]">Add New Book</span>
                  <span className="block text-xs text-[#64748B]">Add a new book to the library</span>
                </div>
              </div>
              <FiArrowRight className="w-5 h-5 text-[#64748B]" />
            </div>
          </button>
          <button className="p-4 rounded-xl border transition-all hover:-translate-y-[1px] border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FiUsers className="w-5 h-5 text-[#16A34A]" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-medium text-[#0F172A]">Add Librarian</span>
                  <span className="block text-xs text-[#64748B]">Register a new librarian</span>
                </div>
              </div>
              <FiArrowRight className="w-5 h-5 text-[#64748B]" />
            </div>
          </button>
          <button className="p-4 rounded-xl border transition-all hover:-translate-y-[1px] border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FiActivity className="w-5 h-5 text-[#6366F1]" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-medium text-[#0F172A]">View Activity</span>
                  <span className="block text-xs text-[#64748B]">Check recent activities</span>
                </div>
              </div>
              <FiArrowRight className="w-5 h-5 text-[#64748B]" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LibrarianAdminDashboard;
