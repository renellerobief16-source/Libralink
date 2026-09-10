import { useState, useEffect } from 'react';
import { 
  getStudentNotifications, markNotificationAsRead, getAnnouncements 
} from '../../../utils/api';
import Card from "../../ui/Card";
import EmptyState from "../../ui/EmptyState";
import Button from "../../ui/Button";
import AnnouncementModal from "../../ui/AnnouncementModal";
import { 
  FiMail, FiSend, FiBell, FiCheckCircle, FiClock, FiAlertCircle, 
  FiBook, FiExternalLink, FiCheck, FiFilter, FiCompass, FiLayers, FiMessageSquare,
  FiArrowRight
} from "react-icons/fi";
import { formatPhilippineDateTime, formatRelativeTime } from "../../../utils/timeUtils";

function AdminInbox({ darkMode, onNavigateTab }) {
  const [activeInboxTab, setActiveInboxTab] = useState('alerts'); // 'alerts' | 'announcements'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAlerts, setFilterAlerts] = useState('all'); // all, unread, inter_school
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  const getProfileImage = (notification) => {
    return notification.student_profile_picture ||
      notification.borrower_profile_picture ||
      notification.requester_profile_picture ||
      notification.sender_profile_picture ||
      notification.senderProfilePicture ||
      notification.profile_picture ||
      notification.profile_image ||
      notification.actor_profile_picture ||
      '';
  };

  const getSenderName = (notification) => {
    return notification.student_name ||
      notification.borrower_name ||
      notification.requester_name ||
      notification.sender_name ||
      notification.senderName ||
      notification.actor_name ||
      notification.staff_name ||
      'Library Desk Alert';
  };

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const { data, error } = await getAnnouncements();
      if (!error && Array.isArray(data)) {
        setAnnouncements(data);
      } else if (Array.isArray(data?.data)) {
        setAnnouncements(data.data);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('currentUser') || localStorage.getItem('currentUserId');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const userId = currentUser?.id || currentUser?.sub || userStr;

      if (userId) {
        const { data, error } = await getStudentNotifications(userId);
        if (!error && data && Array.isArray(data)) {
          const formattedNotifications = data.map(notif => ({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            created_at: notif.created_at,
            read: notif.read,
            sender_name: getSenderName(notif),
            sender_profile_picture: getProfileImage(notif),
            is_inter_school: (notif.title || '').toLowerCase().includes('inter-school') || (notif.message || '').toLowerCase().includes('inter-school')
          }));
          setNotifications(formattedNotifications);
        } else {
          setNotifications([]);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchNotifications();
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    }

    if (onNavigateTab && (notification.title?.toLowerCase().includes('request') || notification.message?.toLowerCase().includes('request'))) {
      onNavigateTab('borrow-requests');
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const notif of unread) {
      markNotificationAsRead(notif.id).catch(console.error);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filterAlerts === 'unread') return !n.read;
    if (filterAlerts === 'inter_school') return n.is_inter_school;
    return true;
  });

  return (
    <div className="animate-slide-up space-y-6">
      {/* Modern Academic Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/10 mb-3">
              <FiMessageSquare className="w-3.5 h-3.5 text-blue-300" />
              Staff Communications & Desk Feeds
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Staff Inbox & Announcements</h1>
            <p className="text-blue-200/80 text-sm mt-1 max-w-xl">
              Real-time notifications for incoming borrow requests, inter-school approvals, hold cancellations, and campus announcements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center min-w-[90px]">
              <div className="text-2xl font-black text-white">{unreadCount}</div>
              <div className="text-[11px] text-blue-200 font-medium">Unread Alerts</div>
            </div>
            <Button
              onClick={() => setShowAnnouncementModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md py-2.5"
            >
              <FiSend className="w-3.5 h-3.5 mr-1.5" />
              Post Announcement
            </Button>
          </div>
        </div>
      </div>

      {/* Two-Channel Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveInboxTab('alerts')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeInboxTab === 'alerts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FiBell className="w-4 h-4" />
            <span>Desk Alerts & Requests</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-black">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveInboxTab('announcements')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeInboxTab === 'announcements'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FiCompass className="w-4 h-4" />
            <span>Campus Announcements</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              {announcements.length}
            </span>
          </button>
        </div>

        {activeInboxTab === 'alerts' && unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 pb-2.5 flex items-center gap-1 transition-colors"
          >
            <FiCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Channel 1: Desk Alerts */}
      {activeInboxTab === 'alerts' && (
        <div className="space-y-4">
          {/* Sub-filter pills */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterAlerts('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterAlerts === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                All Alerts ({notifications.length})
              </button>
              <button
                onClick={() => setFilterAlerts('unread')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterAlerts === 'unread' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Unread Only ({unreadCount})
              </button>
              <button
                onClick={() => setFilterAlerts('inter_school')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterAlerts === 'inter_school' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Inter-School ({notifications.filter(n => n.is_inter_school).length})
              </button>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Philippine Time (PHT, UTC+8)
            </div>
          </div>

          {loading ? (
            <Card>
              <div className="p-12 text-center text-slate-500">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
                <p className="text-xs">Checking desk notifications...</p>
              </div>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <div className="p-12 text-center">
                <FiCheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">Inbox is Clean</p>
                <p className="text-xs text-slate-400 mt-0.5">You have no unread desk alerts or circulation notices.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                    notification.read 
                      ? 'bg-white/80 border-slate-200/70 hover:bg-slate-50' 
                      : 'bg-blue-50/50 border-blue-200 shadow-xs hover:bg-blue-50/80'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                      {(notification.sender_name || 'LB').split(' ').map(p => p[0]).slice(0, 2).join('')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{notification.sender_name}</h4>
                          {notification.is_inter_school && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold uppercase">
                              Inter-School
                            </span>
                          )}
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {notification.created_at ? formatPhilippineDateTime(notification.created_at) : ''} ({notification.created_at ? formatRelativeTime(notification.created_at) : ''})
                        </span>
                      </div>

                      <p className="font-semibold text-xs text-blue-900 mb-0.5">{notification.title}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{notification.message}</p>

                      <div className="mt-3 flex items-center gap-2">
                        {onNavigateTab && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationClick(notification);
                              onNavigateTab('borrow-requests');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                          >
                            <span>Open in Borrow Requests</span>
                            <FiArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationClick(notification);
                            }}
                            className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Channel 2: Campus Announcements */}
      {activeInboxTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-600">Official Broadcast Announcements Feed</p>
            <Button
              onClick={() => setShowAnnouncementModal(true)}
              size="sm"
              variant="secondary"
              className="text-xs font-semibold"
            >
              + Create New Announcement
            </Button>
          </div>

          {loadingAnnouncements ? (
            <Card>
              <div className="p-12 text-center text-slate-500">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
                <p className="text-xs">Loading campus announcements...</p>
              </div>
            </Card>
          ) : announcements.length === 0 ? (
            <Card>
              <div className="p-12 text-center">
                <FiCompass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">No Announcements Posted</p>
                <p className="text-xs text-slate-400 mt-0.5">Use the "+ Post Announcement" button to publish library updates.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => (
                <div 
                  key={item.announcement_id || item.id} 
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                        LIB
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                        <p className="text-[11px] text-slate-400">Official Library Bulletin</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide">
                      {item.is_global || item.school_id == null ? 'Global' : 'Campus'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed mt-2 pl-10">
                    {item.content}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 pl-10">
                    <span>Published: {item.created_at ? formatPhilippineDateTime(item.created_at) : ''}</span>
                    <span>{item.created_at ? formatRelativeTime(item.created_at) : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Announcement Modal */}
      <AnnouncementModal
        open={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        superAdmin={false}
        onCreated={() => {
          setShowAnnouncementModal(false);
          fetchAnnouncements();
        }}
      />
    </div>
  );
}

export default AdminInbox;
