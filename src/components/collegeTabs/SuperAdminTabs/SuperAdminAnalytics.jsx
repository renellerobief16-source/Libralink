import { useState, useEffect } from 'react';
import { FiBook, FiUsers, FiActivity, FiAlertCircle, FiDownload, FiCalendar, FiFilter, FiRefreshCw } from 'react-icons/fi';
import api from '../../../utils/api';
import { LoadingOverlay } from '../../common';
import { PageHeader, Button, Card, Select } from '../../ui';

function SuperAdminAnalytics({ darkMode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [schools, setSchools] = useState([]);
  
  const [kpiData, setKpiData] = useState({
    totalBooks: 0,
    totalUsers: 0,
    activeBorrows: 0,
    overdueBooks: 0,
  });
  
  const [analyticsData, setAnalyticsData] = useState({
    monthlyBorrows: [],
    categoryWiseData: [],
    schoolWiseData: [],
  });
  
  const [popularBooks, setPopularBooks] = useState([]);
  const [libraryStats, setLibraryStats] = useState({
    availableBooks: 0,
    borrowedBooks: 0,
    overdueBooks: 0,
    totalCopies: 0,
  });

  const fetchSchools = async () => {
    try {
      const res = await api.get('/schools');
      setSchools(res.data || []);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  const fetchKPIs = async () => {
    try {
      const [booksRes, usersRes, borrowsRes, overdueRes] = await Promise.all([
        api.get('/books'),
        api.get('/users'),
        api.get('/borrow/active'),
        api.get('/borrow/overdue'),
      ]);

      setKpiData({
        totalBooks: booksRes.data?.length || 0,
        totalUsers: usersRes.data?.length || 0,
        activeBorrows: borrowsRes.data?.length || 0,
        overdueBooks: overdueRes.data?.length || 0,
      });

      setLibraryStats({
        availableBooks: booksRes.data?.length || 0,
        borrowedBooks: borrowsRes.data?.length || 0,
        overdueBooks: overdueRes.data?.length || 0,
        totalCopies: booksRes.data?.length || 0,
      });
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/admin/analytics');
      if (res.data) {
        setAnalyticsData(res.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const fetchPopularBooks = async () => {
    try {
      const res = await api.get('/books/popular?limit=10');
      setPopularBooks(res.data || []);
    } catch (err) {
      console.error('Error fetching popular books:', err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchSchools(),
        fetchKPIs(),
        fetchAnalytics(),
        fetchPopularBooks(),
      ]);
    } catch (err) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [dateRange, schoolFilter]);

  const handleExport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      kpi: kpiData,
      analytics: analyticsData,
      popularBooks,
      libraryStats,
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card padding="md" className="max-w-md">
          <div className="text-center">
            <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Unable to load analytics data</h3>
            <p className="text-sm text-slate-600 mb-4">{error}</p>
            <Button onClick={fetchAllData}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <LoadingOverlay show={loading} text="Loading analytics..." />

      <PageHeader
        title="Analytics"
        description="Library system performance and usage overview"
        actions={[
          { label: 'Export Report', onClick: handleExport, icon: <FiDownload /> },
          { label: 'Refresh', onClick: fetchAllData, icon: <FiRefreshCw /> },
        ]}
      />

      {/* Filters */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <FiCalendar className="w-4 h-4 text-slate-500" />
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={[
                { value: '1', label: 'Today' },
                { value: '7', label: 'Last 7 Days' },
                { value: '30', label: 'Last 30 Days' },
                { value: '90', label: 'This Month' },
                { value: '365', label: 'This Year' },
              ]}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <FiFilter className="w-4 h-4 text-slate-500" />
            <Select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Schools' },
                ...schools.map((school) => ({ value: school.school_id, label: school.school_name }))
              ]}
              className="w-48"
            />
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card padding="md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiBook className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Books</p>
              <p className="text-2xl font-bold text-slate-900">{kpiData.totalBooks.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiUsers className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Users</p>
              <p className="text-2xl font-bold text-slate-900">{kpiData.totalUsers.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiActivity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Active Borrows</p>
              <p className="text-2xl font-bold text-slate-900">{kpiData.activeBorrows.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiAlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Overdue Books</p>
              <p className="text-2xl font-bold text-slate-900">{kpiData.overdueBooks.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Borrowing Trends */}
        <Card padding="md">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Borrowing Trends</h3>
          {analyticsData.monthlyBorrows.length === 0 ? (
            <p className="text-sm text-slate-500">No borrowing data available</p>
          ) : (
            <div className="relative h-48">
              <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={i * 30}
                    x2="400"
                    y2={i * 30}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                ))}
                
                {/* Line chart */}
                {(() => {
                  const data = analyticsData.monthlyBorrows;
                  const maxCount = Math.max(...data.map(d => d.count), 1);
                  const width = 400;
                  const height = 150;
                  const padding = 20;
                  
                  const points = data.map((item, index) => {
                    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
                    const y = height - padding - (item.count / maxCount) * (height - padding * 2);
                    return `${x},${y}`;
                  }).join(' ');
                  
                  return (
                    <>
                      <polyline
                        points={points}
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {data.map((item, index) => {
                        const x = padding + (index / (data.length - 1)) * (width - padding * 2);
                        const y = height - padding - (item.count / maxCount) * (height - padding * 2);
                        return (
                          <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r="4"
                            fill="#2563EB"
                            className="hover:r-6 transition-all cursor-pointer"
                          />
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
              
              {/* X-axis labels */}
              <div className="flex justify-between mt-2 px-2">
                {analyticsData.monthlyBorrows.map((item, index) => (
                  <span key={index} className="text-xs text-slate-600">{item.month}</span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Books by Category */}
        <Card padding="md">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Books by Category</h3>
          <div className="space-y-3">
            {analyticsData.categoryWiseData.length === 0 ? (
              <p className="text-sm text-slate-500">No category data available</p>
            ) : (
              analyticsData.categoryWiseData.map((cat, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs font-medium flex-1 text-slate-700 truncate">{cat.category}</span>
                  <div className="w-32 h-8 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-lg transition-all"
                      style={{ width: `${(cat.count / Math.max(...analyticsData.categoryWiseData.map(d => d.count), 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-900 w-8 text-right">{cat.count}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* School Performance */}
        <Card padding="md" className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">School Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-medium text-slate-600 pb-3">School</th>
                  <th className="text-right text-xs font-medium text-slate-600 pb-3">Total Books</th>
                  <th className="text-right text-xs font-medium text-slate-600 pb-3">Active Users</th>
                  <th className="text-right text-xs font-medium text-slate-600 pb-3">Borrowed Books</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.schoolWiseData.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center text-sm text-slate-500 py-4">No school data available</td>
                  </tr>
                ) : (
                  analyticsData.schoolWiseData.map((school, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="text-sm text-slate-900 py-3">{school.school_name}</td>
                      <td className="text-sm text-slate-900 py-3 text-right">{school.total_books}</td>
                      <td className="text-sm text-slate-900 py-3 text-right">{school.active_borrows}</td>
                      <td className="text-sm text-slate-900 py-3 text-right">{school.active_borrows}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Library Statistics */}
        <Card padding="md">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Library Statistics</h3>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-slate-600">Available Books</p>
              <p className="text-xl font-bold text-blue-600">{libraryStats.availableBooks.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-slate-600">Borrowed Books</p>
              <p className="text-xl font-bold text-blue-600">{libraryStats.borrowedBooks.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-slate-600">Overdue Books</p>
              <p className="text-xl font-bold text-red-600">{libraryStats.overdueBooks.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">Total Copies</p>
              <p className="text-xl font-bold text-slate-900">{libraryStats.totalCopies.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Most Borrowed Books */}
      <Card padding="md">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Most Borrowed Books</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-xs font-medium text-slate-600 pb-3 w-16">Rank</th>
                <th className="text-left text-xs font-medium text-slate-600 pb-3">Book Title</th>
                <th className="text-left text-xs font-medium text-slate-600 pb-3">Author</th>
                <th className="text-right text-xs font-medium text-slate-600 pb-3 w-24">Borrow Count</th>
              </tr>
            </thead>
            <tbody>
              {popularBooks.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-sm text-slate-500 py-4">No borrowing data available</td>
                </tr>
              ) : (
                popularBooks.map((book, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="text-sm text-slate-900 py-3">#{index + 1}</td>
                    <td className="text-sm text-slate-900 py-3 font-medium">{book.title}</td>
                    <td className="text-sm text-slate-600 py-3">{book.author}</td>
                    <td className="text-sm text-slate-900 py-3 text-right font-medium">{book.borrow_count || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default SuperAdminAnalytics;
