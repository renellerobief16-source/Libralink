import { useState, useEffect, useMemo } from "react";
import { 
  FiActivity, FiBook, FiUser, FiClock, FiSearch, FiRefreshCw, 
  FiLogIn, FiDollarSign, FiCheckCircle, FiShield, FiSliders, FiCalendar 
} from "react-icons/fi";
import api, { getBackendAssetUrl } from "../../../utils/api";
import { AnimatedCounter } from "../../common";

function LibrarianAdminActivityLog({ darkMode }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let res = await api.get(`/activity-logs/school/${schoolId}`).catch(() => null);
      if (!res?.data?.success && !Array.isArray(res?.data)) {
        res = await api.get(`/activities/school/${schoolId}`).catch(() => ({ data: [] }));
      }
      
      const rawData = res?.data?.data || res?.data || [];
      const formatted = Array.isArray(rawData) ? rawData : [];
      setActivities(formatted);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getActivityType = (act) => {
    const type = (act.activity_type || act.action || act.type || '').toLowerCase();
    const desc = (act.description || act.activity || act.details || '').toLowerCase();

    if (desc.includes('policy') || desc.includes('settings') || type.includes('policy')) return 'policy';
    if (type.includes('login') || desc.includes('signed into') || desc.includes('logged in')) return 'login';
    if (type.includes('borrow') || desc.includes('borrowed') || desc.includes('issued')) return 'borrow';
    if (type.includes('return') || desc.includes('returned') || desc.includes('checked in')) return 'return';
    if (type.includes('fine') || desc.includes('fine') || desc.includes('payment') || desc.includes('waived')) return 'fine';
    return 'general';
  };

  const getActivityMeta = (act) => {
    const actType = getActivityType(act);
    switch (actType) {
      case 'policy':
        return {
          icon: FiSliders,
          color: 'text-purple-600 bg-purple-50 border-purple-200',
          badge: 'bg-purple-50 text-purple-700 border-purple-200',
          label: 'Policy Update'
        };
      case 'login':
        return {
          icon: FiLogIn,
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'User Sign In'
        };
      case 'borrow':
        return {
          icon: FiBook,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Book Borrowed'
        };
      case 'return':
        return {
          icon: FiCheckCircle,
          color: 'text-teal-600 bg-teal-50 border-teal-200',
          badge: 'bg-teal-50 text-teal-700 border-teal-200',
          label: 'Book Returned'
        };
      case 'fine':
        return {
          icon: FiDollarSign,
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Fine Assessment'
        };
      default:
        return {
          icon: FiActivity,
          color: 'text-slate-600 bg-slate-50 border-slate-200',
          badge: 'bg-slate-50 text-slate-700 border-slate-200',
          label: 'System Activity'
        };
    }
  };

  const getFullName = (user, act) => {
    const fn = user?.firstname || act?.firstname;
    const ln = user?.lastname || act?.lastname;
    if (fn || ln) {
      return [fn, ln].filter(Boolean).join(' ');
    }
    if (user?.email) return user.email.split('@')[0];
    if (act?.user) return act.user;
    return 'Library Staff';
  };

  const getInitials = (name) => {
    if (!name) return 'LS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleBadge = (user, act) => {
    const roleId = Number(user?.role_id || act?.role_id || 0);
    const roleStr = String(user?.role_name || user?.role || act?.role || '').toLowerCase();
    
    if (roleId === 1 || roleStr.includes('super')) {
      return { label: 'Super Admin', style: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    if (roleId === 2 || roleStr.includes('admin')) {
      return { label: 'Admin Librarian', style: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (roleId === 3 || roleStr.includes('librarian')) {
      return { label: 'Librarian', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (roleId === 4 || roleStr.includes('student')) {
      return { label: 'Student', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    return { label: 'Library Staff', style: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  // Filter and search
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const actType = getActivityType(act);
      if (filter !== 'all' && actType !== filter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      
      const user = act.users || {};
      const fullName = getFullName(user, act).toLowerCase();
      const idNum = `${user.student_number || user.employee_number || ''}`.toLowerCase();
      const desc = `${act.description || act.activity || act.details || ''}`.toLowerCase();
      const role = `${user.role || user.role_name || ''}`.toLowerCase();

      return fullName.includes(q) || idNum.includes(q) || desc.includes(q) || role.includes(q);
    });
  }, [activities, filter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let logins = 0;
    let borrows = 0;
    let returns = 0;
    let fines = 0;

    activities.forEach(a => {
      const type = getActivityType(a);
      if (type === 'login') logins++;
      else if (type === 'borrow') borrows++;
      else if (type === 'return') returns++;
      else if (type === 'fine') fines++;
    });

    return { total: activities.length, logins, borrows, returns, fines };
  }, [activities]);

  return (
    <div className="animate-slide-up space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <FiActivity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Activity & Audit Stream</h2>
              <p className="text-xs text-slate-500">Live operational logs, member logins, and circulation transactions</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Logs'}</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Events</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600"><FiActivity className="w-3.5 h-3.5" /></span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            <AnimatedCounter value={stats.total} />
          </p>
          <span className="text-[11px] text-slate-400">Captured in audit log</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Member Logins</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100"><FiLogIn className="w-3.5 h-3.5" /></span>
          </div>
          <p className="text-2xl font-black text-emerald-700">
            <AnimatedCounter value={stats.logins} />
          </p>
          <span className="text-[11px] text-slate-400">Student & staff sign-ins</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Circulation</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100"><FiBook className="w-3.5 h-3.5" /></span>
          </div>
          <p className="text-2xl font-black text-blue-700">
            <AnimatedCounter value={stats.borrows + stats.returns} />
          </p>
          <span className="text-[11px] text-slate-400">{stats.borrows} loans • {stats.returns} returns</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Fines & Fees</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100"><FiDollarSign className="w-3.5 h-3.5" /></span>
          </div>
          <p className="text-2xl font-black text-amber-700">
            <AnimatedCounter value={stats.fines} />
          </p>
          <span className="text-[11px] text-slate-400">Assessments & settlements</span>
        </div>
      </div>

      {/* Search Bar & Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, student ID, employee number, action..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50/80 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            {[
              { id: 'all', label: 'All Events', icon: FiActivity },
              { id: 'login', label: 'Logins & Access', icon: FiLogIn },
              { id: 'borrow', label: 'Borrow Loans', icon: FiBook },
              { id: 'return', label: 'Book Returns', icon: FiCheckCircle },
              { id: 'fine', label: 'Fines & Fees', icon: FiDollarSign },
              { id: 'policy', label: 'Policy Updates', icon: FiSliders },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity Stream List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Audit Stream ({filteredActivities.length})
          </h3>
          <span className="text-[11px] text-slate-400">Sorted by most recent</span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Fetching institution activity stream...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FiActivity className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">No Activity Logs Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? `No logs matched "${searchQuery}". Try clearing your search query.` : 'There are no recorded activities for this filter category yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredActivities.map((act, index) => {
              const meta = getActivityMeta(act);
              const Icon = meta.icon;
              const user = act.users || {};
              const fullName = getFullName(user, act);
              const initials = getInitials(fullName);
              const roleBadge = getRoleBadge(user, act);
              
              const idNumber = (user.student_number && user.student_number.toLowerCase() !== 'none') ? user.student_number : 
                               (user.employee_number && user.employee_number.toLowerCase() !== 'none') ? user.employee_number : 
                               (act.student_number && act.student_number.toLowerCase() !== 'none') ? act.student_number : null;

              const profileImg = user.profile_image || act.profile_image || act.profile_picture;
              const description = act.description || act.activity || act.details || `${fullName} performed ${act.action || 'system action'}`;
              const timeDisplay = formatTimestamp(act.created_at || act.timestamp);

              return (
                <div
                  key={act.log_id || act.id || index}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex items-start gap-4 group"
                >
                  {/* User Profile Avatar with Type Badge */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center overflow-hidden shadow-xs ring-1 ring-slate-200">
                      {profileImg ? (
                        <img
                          src={getBackendAssetUrl(profileImg)}
                          alt={fullName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement.innerHTML = `<span class="text-xs font-bold text-white tracking-wider">${initials}</span>`;
                          }}
                        />
                      ) : (
                        <span className="text-xs font-bold text-white tracking-wider">
                          {initials}
                        </span>
                      )}
                    </div>
                    {/* Floating Activity Type Mini Badge */}
                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-md border shadow-xs ${meta.color}`}>
                      <Icon className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  {/* Activity Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {fullName}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleBadge.style}`}>
                        {roleBadge.label}
                      </span>
                      {idNumber && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {idNumber}
                        </span>
                      )}
                      <span className="text-slate-300 hidden sm:inline">•</span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {meta.label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed break-words font-medium">
                      {description}
                    </p>
                  </div>

                  {/* Relative Timestamp */}
                  <div className="flex items-center gap-1 text-xs text-slate-400 font-medium whitespace-nowrap flex-shrink-0 pt-0.5">
                    <FiClock className="w-3.5 h-3.5" />
                    <span>{timeDisplay}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default LibrarianAdminActivityLog;
