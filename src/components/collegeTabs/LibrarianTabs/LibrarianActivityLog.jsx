import { useState, useEffect } from "react";
import { FiActivity, FiBook, FiUser, FiClock } from "react-icons/fi";
import Card from "../../ui/Card";
import EmptyState from "../../ui/EmptyState";
import api from "../../../utils/api";

function AdminActivityLog() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      console.error('No schoolId found in localStorage');
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/activities/school/${schoolId}`);
      const activitiesData = response.data || [];
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
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
        return <FiClock className="w-5 h-5 text-[#DC2626]" />;
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

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter);

  return (
    <div className="animate-slide-up">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1">Activity Log</h2>
        <p className="text-[#64748B] text-sm">Track all library activities and transactions</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-[#2563EB] text-white' 
              : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
          }`}
        >
          All Activities
        </button>
        <button
          onClick={() => setFilter('borrow')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'borrow' 
              ? 'bg-[#2563EB] text-white' 
              : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
          }`}
        >
          Borrows
        </button>
        <button
          onClick={() => setFilter('return')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'return' 
              ? 'bg-[#2563EB] text-white' 
              : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
          }`}
        >
          Returns
        </button>
        <button
          onClick={() => setFilter('fine')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'fine' 
              ? 'bg-[#2563EB] text-white' 
              : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
          }`}
        >
          Fines
        </button>
      </div>

      {/* Activity List */}
      <Card>
        {loading ? (
          <p className="text-sm text-[#64748B]">Loading activities...</p>
        ) : filteredActivities.length === 0 ? (
          <EmptyState
            icon={<FiActivity />}
            title="No Activities"
            description="No activities recorded yet."
          />
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-[#F8FAFC] hover:bg-slate-50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-[#0F172A]">
                        {activity.user} {activity.action} <span className="font-semibold">{activity.book}</span>
                      </p>
                      <p className="text-sm text-[#64748B] mt-1">{activity.details}</p>
                    </div>
                    <span className="text-xs text-[#64748B] whitespace-nowrap">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminActivityLog;
