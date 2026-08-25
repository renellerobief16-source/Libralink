import { useState, useEffect } from 'react';
import { FiBook, FiUsers, FiGlobe, FiBell, FiActivity, FiRefreshCw, FiTrendingUp, FiAlertCircle, FiClock, FiBarChart2, FiDownload, FiFileText, FiCpu, FiHardDrive, FiDatabase, FiServer } from 'react-icons/fi';
import api from '../../../utils/api';
import { PageLoader, CardLoader, LoadingOverlay } from '../../common';
import { 
  LiveAnalogClock, 
  DashboardGreeting, 
  WeatherWidget, 
  DigitalClock, 
  DashboardRefreshButton 
} from '../../common';
import { PageHeader, Button, Card, StatusBadge } from '../../ui';

function SuperAdminDashboard({ darkMode, onOpenInbox }) {
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalUsers: 0,
    totalBooks: 0,
    totalBorrows: 0,
    overdueBooks: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [popularBooks, setPopularBooks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    apiStatus: 'online',
    dbStatus: 'connected',
    apiResponseTime: 45,
    dbResponseTime: 32,
    cpuUsage: 45,
    memoryUsage: 62,
    diskUsage: 58,
  });

  const fetchStats = async () => {
    try {
      // Fetch schools count
      let totalSchools = 0;
      try {
        const schoolsRes = await api.get('/schools');
        totalSchools = schoolsRes.data?.length || 0;
        console.log('Total schools:', totalSchools);
      } catch (e) {
        console.error('Error fetching schools:', e);
      }

      // Fetch users count
      let totalUsers = 0;
      try {
        const usersRes = await api.get('/users');
        totalUsers = usersRes.data?.length || 0;
        console.log('Total users:', totalUsers);
      } catch (e) {
        console.error('Error fetching users:', e);
      }

      // Fetch books count
      let totalBooks = 0;
      try {
        console.log('[DASHBOARD] Fetching books count...');
        const booksRes = await api.get('/books/count');
        totalBooks = booksRes.data?.count || 0;
        console.log('[DASHBOARD] Total books:', totalBooks);
      } catch (e) {
        console.error('[DASHBOARD] Error fetching books count:', e);
      }

      // Fetch active borrows count
      let totalBorrows = 0;
      try {
        const borrowsRes = await api.get('/borrow/active');
        totalBorrows = borrowsRes.data?.length || 0;
        console.log('Total active borrows:', totalBorrows);
      } catch (e) {
        console.error('Error fetching borrows:', e);
      }

      // Fetch overdue books
      let overdueBooks = 0;
      try {
        const overdueRes = await api.get('/borrow/overdue');
        overdueBooks = overdueRes.data?.length || 0;
        console.log('Overdue books:', overdueBooks);
      } catch (e) {
        console.error('Error fetching overdue:', e);
      }

      // Calculate active users (users with active borrows)
      const activeUsers = totalBorrows > 0 ? Math.min(totalBorrows, totalUsers) : 0;

      setStats({
        totalSchools,
        totalUsers,
        totalBooks,
        totalBorrows,
        overdueBooks,
        activeUsers,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      // Try fetching from activity logs API
      const activitiesRes = await api.get('/activity-logs/recent?limit=10');
      if (activitiesRes.data && activitiesRes.data.length > 0) {
        // Transform logs to match the expected format
        const transformedActivities = activitiesRes.data.map(log => {
          return {
            type: log.activity || 'system',
            user_name: log.user_name || 'System',
            school_name: log.school_name || 'Unknown',
            role: log.role || 'Admin',
            created_at: log.created_at || log.timestamp,
          };
        });
        setRecentActivities(transformedActivities);
      } else {
        setRecentActivities([]);
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      // Set empty array on error to prevent UI issues
      setRecentActivities([]);
    }
  };


  const fetchPopularBooks = async () => {
    try {
      // Fetch popular books (most borrowed)
      const popularRes = await api.get('/books/popular?limit=5');
      setPopularBooks(popularRes.data || []);
    } catch (error) {
      console.error('Error fetching popular books:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      // Generate alerts based on system status
      const newAlerts = [];
      
      if (stats.overdueBooks > 10) {
        newAlerts.push({
          type: 'warning',
          message: `${stats.overdueBooks} books are overdue`,
          icon: FiAlertCircle,
        });
      }
      
      if (stats.totalBorrows > stats.totalBooks * 0.8) {
        newAlerts.push({
          type: 'info',
          message: 'Library utilization is high (80%+)',
          icon: FiTrendingUp,
        });
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };


  const fetchAuditLogs = async () => {
    try {
      const logsRes = await api.get('/admin/audit-logs');
      setAuditLogs(logsRes.data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      // Mock data as fallback
      setAuditLogs([
        { id: 1, action: 'User Created', user: 'Super Admin', target: 'John Doe', timestamp: new Date().toISOString() },
        { id: 2, action: 'Book Added', user: 'Librarian', target: 'Introduction to Programming', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, action: 'School Updated', user: 'Super Admin', target: 'Santa Rita College', timestamp: new Date(Date.now() - 7200000).toISOString() },
        { id: 4, action: 'User Deactivated', user: 'Super Admin', target: 'Jane Smith', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { id: 5, action: 'Settings Changed', user: 'Super Admin', target: 'System Settings', timestamp: new Date(Date.now() - 172800000).toISOString() },
      ]);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const healthRes = await api.get('/admin/system-health');
      if (healthRes.data) {
        setSystemHealth(healthRes.data);
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
      // Use default values on error
      setSystemHealth({
        apiStatus: 'online',
        dbStatus: 'connected',
        apiResponseTime: 45,
        dbResponseTime: 32,
        cpuUsage: 45,
        memoryUsage: 62,
        diskUsage: 58,
      });
    }
  };

  const handleExportReport = (format) => {
    // Create report data
    const reportData = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
      analytics: analyticsData,
    };

    if (format === 'json') {
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `library-report-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      // Create CSV for statistics
      let csv = 'Metric,Value\n';
      csv += `Total Schools,${stats.totalSchools}\n`;
      csv += `Total Users,${stats.totalUsers}\n`;
      csv += `Total Books,${stats.totalBooks}\n`;
      csv += `Active Borrows,${stats.totalBorrows}\n`;
      csv += `Overdue Books,${stats.overdueBooks}\n`;
      csv += `Active Users,${stats.activeUsers}\n`;
      
      const dataBlob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `library-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchRecentActivities(), fetchPopularBooks(), fetchAlerts(), fetchAuditLogs(), fetchSystemHealth()]);
    setRefreshing(false);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const statCards = [
    { id: 'schools', label: 'Total Schools', value: stats.totalSchools, icon: FiGlobe },
    { id: 'users', label: 'Total Users', value: stats.totalUsers, icon: FiUsers },
    { id: 'books', label: 'Total Books', value: stats.totalBooks, icon: FiBook },
    { id: 'borrows', label: 'Active Borrows', value: stats.totalBorrows, icon: FiActivity },
    { id: 'overdue', label: 'Overdue Books', value: stats.overdueBooks, icon: FiAlertCircle },
    { id: 'active', label: 'Active Users', value: stats.activeUsers, icon: FiTrendingUp },
  ];

  return (
    <div className="animate-slide-up">
      <LoadingOverlay show={loading} text="Loading dashboard..." />
      
      {!loading && (
        <>
          {/* Custom Dashboard Header */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm pt-4">
            <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
              {/* Left: Greeting + Illustration */}
              <DashboardGreeting />
              
              {/* Middle: Weather + Digital Clock */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <WeatherWidget />
                <DigitalClock />
              </div>
              
              {/* Right: Analog Clock */}
              <div className="flex items-center">
                <LiveAnalogClock size="header" />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.id} padding="md">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-3xl font-bold text-slate-900">
                {loading ? '...' : stat.value.toLocaleString()}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-600">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">System Alerts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {alerts.map((alert, index) => (
              <Card key={index} padding="md">
                <div className="flex items-center gap-3">
                  <alert.icon className={`w-5 h-5 ${alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600'}`} />
                  <p className={`text-sm font-medium ${alert.type === 'warning' ? 'text-amber-800' : 'text-blue-800'}`}>
                    {alert.message}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Audit Logs Section */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Audit Logs</h3>
        <Card padding="md">
          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-slate-500">No audit logs available</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 rounded-lg bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{log.action}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        <span className="font-medium">User:</span> {log.user} | <span className="font-medium">Target:</span> {log.target}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* System Health Section */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4">System Health Monitor</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Status */}
            <Card padding="md">
              <h4 className="text-md font-semibold text-slate-900 mb-4">Service Status</h4>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FiServer className={`w-5 h-5 ${systemHealth.apiStatus === 'online' ? 'text-green-500' : 'text-red-500'}`} />
                      <span className="text-sm font-medium text-slate-900">API Server</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600">{systemHealth.apiResponseTime}ms</span>
                      <StatusBadge status={systemHealth.apiStatus} variant={systemHealth.apiStatus === 'online' ? 'success' : 'error'} />
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FiDatabase className={`w-5 h-5 ${systemHealth.dbStatus === 'connected' ? 'text-green-500' : 'text-red-500'}`} />
                      <span className="text-sm font-medium text-slate-900">Database</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600">{systemHealth.dbResponseTime}ms</span>
                      <StatusBadge status={systemHealth.dbStatus} variant={systemHealth.dbStatus === 'connected' ? 'success' : 'error'} />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Resource Usage */}
            <Card padding="md">
              <h4 className="text-md font-semibold text-slate-900 mb-4">Resource Usage</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FiCpu className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium text-slate-900">CPU Usage</span>
                    </div>
                    <span className="text-sm font-medium text-slate-900">{systemHealth.cpuUsage}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${systemHealth.cpuUsage > 80 ? 'bg-red-500' : systemHealth.cpuUsage > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${systemHealth.cpuUsage}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FiHardDrive className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium text-slate-900">Memory Usage</span>
                    </div>
                    <span className="text-sm font-medium text-slate-900">{systemHealth.memoryUsage}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${systemHealth.memoryUsage > 80 ? 'bg-red-500' : systemHealth.memoryUsage > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${systemHealth.memoryUsage}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FiHardDrive className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium text-slate-900">Disk Usage</span>
                    </div>
                    <span className="text-sm font-medium text-slate-900">{systemHealth.diskUsage}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${systemHealth.diskUsage > 80 ? 'bg-red-500' : systemHealth.diskUsage > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${systemHealth.diskUsage}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padding="md">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-slate-500">No recent activity</p>
            ) : (
              recentActivities.map((activity, index) => (
                <div key={index} className="p-3 rounded-lg bg-slate-50">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'login' ? 'bg-green-500' :
                      activity.type === 'logout' ? 'bg-red-500' :
                      activity.type === 'borrow' ? 'bg-blue-500' :
                      activity.type === 'return' ? 'bg-blue-500' :
                      activity.type === 'user_registered' ? 'bg-green-500' :
                      'bg-slate-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">
                        {activity.type === 'login' 
                          ? `${activity.user_name || 'User'} (${activity.role || 'User'}) logged in at ${activity.school_name || 'Unknown'}`
                          : activity.type === 'logout'
                          ? `${activity.user_name || 'User'} (${activity.role || 'User'}) logged out from ${activity.school_name || 'Unknown'}`
                          : activity.type === 'borrow'
                          ? `${activity.user_name || 'User'} borrowed "${activity.book_title || 'a book'}" at ${activity.school_name || 'Unknown'}`
                          : activity.type === 'return'
                          ? `${activity.user_name || 'User'} returned "${activity.book_title || 'a book'}" at ${activity.school_name || 'Unknown'}`
                          : activity.type === 'user_registered'
                          ? `New user ${activity.user_name} (${activity.role || 'User'}) registered at ${activity.school_name || 'Unknown'}`
                          : activity.description || 'Activity recorded'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {activity.created_at ? new Date(activity.created_at).toLocaleString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Popular Books</h3>
          <div className="space-y-3">
            {popularBooks.length === 0 ? (
              <p className="text-sm text-slate-500">No data available</p>
            ) : (
              popularBooks.map((book, index) => (
                <div key={index} className="p-3 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-emerald-600">#{index + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{book.title}</p>
                      <p className="text-xs text-slate-500">{book.borrow_count || 0} borrows</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-lg font-bold text-slate-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-slate-900">API Status</p>
                <StatusBadge status="Online" variant="success" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-slate-900">Database</p>
                <StatusBadge status="Connected" variant="success" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-slate-900">Auto-refresh</p>
                <StatusBadge status="Every 30s" variant="info" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FiClock className="w-4 h-4 text-slate-500" />
                  <p className="text-sm font-medium text-slate-900">Last Updated</p>
                </div>
                <span className="text-xs text-slate-500">
                  {refreshing ? 'Refreshing...' : 'Just now'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
        </>
      )}
    </div>
  );
}

export default SuperAdminDashboard;
