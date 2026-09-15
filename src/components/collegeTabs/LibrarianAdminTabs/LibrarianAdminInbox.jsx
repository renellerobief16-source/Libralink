import { useState, useEffect, useMemo } from 'react';
import { 
  getStudentNotifications, markNotificationAsRead, getAnnouncements, 
  deleteAnnouncement, getBackendAssetUrl 
} from '../../../utils/api';
import AnnouncementModal from "../../ui/AnnouncementModal";
import { 
  FiMail, FiSend, FiBell, FiTrash2, FiClock, FiCheck, FiUsers, 
  FiAlertCircle, FiRefreshCw, FiVolume2, FiShield, FiUser 
} from "react-icons/fi";

function LibrarianAdminInbox({ darkMode }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [activeView, setActiveView] = useState('announcements'); // 'announcements' | 'notifications'
  const [deletingId, setDeletingId] = useState(null);

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
      'Library Staff';
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
        if (!error && data) {
          const formattedNotifications = (Array.isArray(data) ? data : (data.data || [])).map(notif => ({
            id: notif.notification_id || notif.id,
            title: notif.title,
            message: notif.message,
            created_at: notif.created_at,
            read: notif.read || notif.is_read,
            sender_name: getSenderName(notif),
            sender_profile_picture: getProfileImage(notif),
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
    if (notification.read) return;
    await markNotificationAsRead(notification.id);
    setNotifications((prev) => prev.map((n) =>
      n.id === notification.id ? { ...n, read: true } : n
    ));
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    setDeletingId(id);
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => (a.announcement_id || a.id) !== id));
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  return (
    <div className="animate-slide-up space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <FiVolume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Inbox & Announcement Hub</h2>
              <p className="text-xs text-slate-500">Publish institution-wide bulletins and view operational direct messages</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAnnouncementModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-xs"
        >
          <FiSend className="w-3.5 h-3.5" />
          <span>+ Create Announcement</span>
        </button>
      </div>

      {/* View Switcher Pills */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveView('announcements')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeView === 'announcements'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FiVolume2 className="w-3.5 h-3.5" />
          <span>Campus Announcements</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            activeView === 'announcements' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {announcements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveView('notifications')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeView === 'notifications'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FiBell className="w-3.5 h-3.5" />
          <span>Direct Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Announcements View */}
      {activeView === 'announcements' && (
        <div className="space-y-4">
          {loadingAnnouncements ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading published announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FiVolume2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">No Announcements Published</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Keep your campus informed about library schedules, book drives, and policy changes.
              </p>
              <button
                onClick={() => setShowAnnouncementModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all cursor-pointer"
              >
                + Create First Announcement
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {announcements.map((ann) => {
                const isUrgent = (ann.priority || '').toLowerCase() === 'urgent' || ann.title?.includes('[URGENT]');
                const audience = (ann.target_audience || 'all').toLowerCase();
                const isGlobal = ann.school_id == null || ann.is_global;

                return (
                  <div
                    key={ann.announcement_id || ann.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{ann.title}</h3>
                          {isUrgent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <FiAlertCircle className="w-3 h-3" />
                              Urgent Notice
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            audience === 'students'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : audience === 'librarians'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            <FiUsers className="w-3 h-3" />
                            {audience === 'students' ? 'Students Only' : audience === 'librarians' ? 'Librarians Only' : 'Everyone (All Campus)'}
                          </span>
                          {isGlobal && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                              Consortium-Wide
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteAnnouncement(ann.announcement_id || ann.id)}
                        disabled={deletingId === (ann.announcement_id || ann.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete announcement"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                      {ann.content}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1.5">
                        <FiClock className="w-3.5 h-3.5" />
                        {new Date(ann.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="text-slate-400 font-medium">Official Dispatch</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notifications View */}
      {activeView === 'notifications' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Inbox Notifications ({notifications.length})
            </h3>
            <span className="text-[11px] text-slate-400">Click a message to mark as read</span>
          </div>

          {loading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FiMail className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">Your Inbox is Empty</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No notifications or messages have arrived yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 sm:p-5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-4 ${
                    !notification.read ? 'bg-blue-50/30 font-medium' : 'bg-white opacity-80'
                  }`}
                >
                  {/* Sender Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-xs flex-shrink-0">
                    {notification.sender_profile_picture ? (
                      <img
                        src={getBackendAssetUrl(notification.sender_profile_picture)}
                        alt={notification.sender_name || 'Staff'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement.innerHTML = `<span class="text-xs font-bold text-slate-600">${(notification.sender_name || 'U').charAt(0).toUpperCase()}</span>`;
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-700">
                        {(notification.sender_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {notification.sender_name || 'Library Staff'}
                        </span>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 mb-0.5">{notification.title}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{notification.message}</p>
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
          fetchAnnouncements();
          setActiveView('announcements');
        }}
      />
    </div>
  );
}

export default LibrarianAdminInbox;
