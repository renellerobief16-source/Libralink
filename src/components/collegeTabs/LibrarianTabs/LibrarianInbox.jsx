import { useState, useEffect } from 'react';
import { getStudentNotifications, markNotificationAsRead, getAnnouncements } from '../../../utils/api';
import Card from "../../ui/Card";
import EmptyState from "../../ui/EmptyState";
import Button from "../../ui/Button";
import AnnouncementModal from "../../ui/AnnouncementModal";
import { FiMail, FiSend } from "react-icons/fi";

function AdminInbox() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
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
      'Library Staff';
  };

  useEffect(() => {
    const fetchAnnouncements = async () => {
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

    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const userStr = localStorage.getItem('currentUser') || localStorage.getItem('currentUserId');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const userId = currentUser?.id || currentUser?.sub || userStr;

        if (userId) {
          const { data, error } = await getStudentNotifications(userId);
          if (!error && data) {
            const formattedNotifications = data.map(notif => ({
              id: notif.id,
              title: notif.title,
              message: notif.message,
              created_at: notif.created_at,
              read: notif.read,
              sender_name: getSenderName(notif),
              sender_profile_picture: getProfileImage(notif),
            }));
            setNotifications(formattedNotifications);
          } else {
            // Add sample notification if no data exists
            const sampleNotifications = [
              {
                id: 'sample-1',
                title: 'Welcome to Admin Dashboard',
                message: 'Welcome to the admin dashboard! You can manage books, students, and borrow requests from here.',
                created_at: new Date().toISOString(),
                read: false,
                sender_name: 'Library Staff',
                sender_profile_picture: '',
              }
            ];
            setNotifications(sampleNotifications);
          }
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleNotificationClick = async (notification) => {
    await markNotificationAsRead(notification.id);
    setNotifications((prev) => prev.map((n) =>
      n.id === notification.id ? { ...n, read: true } : n
    ));
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1">Inbox</h2>
          <p className="text-[#64748B] text-sm">View your notifications and messages</p>
        </div>
        <Button
          onClick={() => setShowAnnouncementModal(true)}
          variant="primary"
          size="sm"
        >
          <FiSend className="w-4 h-4 mr-2" />
          Create Announcement
        </Button>
      </div>

      <div className="mb-6 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2563EB]">Campus updates</p>
            <h3 className="text-lg font-bold text-[#0F172A]">Announcements</h3>
          </div>
        </div>

        {loadingAnnouncements ? (
          <p className="text-sm text-[#64748B]">Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-[#64748B]">No announcements available.</p>
        ) : (
          <div className="space-y-3">
            {announcements.slice(0, 4).map((announcement) => (
              <div key={announcement.announcement_id || announcement.id} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[#0F172A]">{announcement.title}</p>
                  {(announcement.school_id == null || announcement.is_global) && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                      Global
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[#475569]">{announcement.content}</p>
                <p className="mt-2 text-[11px] text-[#64748B]">
                  {new Date(announcement.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-[#64748B]">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<FiMail />}
            title="No Notifications"
            description="You have no notifications at the moment."
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 rounded-lg cursor-pointer ${notification.read ? 'opacity-60' : ''} bg-[#F8FAFC] hover:bg-slate-100 transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    {notification.sender_profile_picture ? (
                      <img
                        src={notification.sender_profile_picture.startsWith('http') ? notification.sender_profile_picture : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000'}${notification.sender_profile_picture.startsWith('/') ? '' : '/'}${notification.sender_profile_picture}`}
                        alt={notification.sender_name || 'Staff'}
                        className="w-10 h-10 rounded-full object-cover border border-[#E2E8F0]"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-10 h-10 rounded-full bg-[#E0F2FE] text-[#0077B6] items-center justify-center text-xs font-semibold ${notification.sender_profile_picture ? 'hidden' : 'flex'}`}
                    >
                      {(notification.sender_name || 'LS').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#0F172A] text-sm">{notification.sender_name || 'Library Staff'}</p>
                        <p className="font-medium text-[#0F172A] mt-0.5">{notification.title}</p>
                        <p className="text-sm text-[#64748B] mt-1">{notification.message}</p>
                      </div>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-[#2563EB] rounded-full mt-1.5 flex-shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <AnnouncementModal
        open={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        superAdmin={false}
        onCreated={() => {
          setShowAnnouncementModal(false);
          window.location.reload();
        }}
      />
    </div>
  );
}

export default AdminInbox;
