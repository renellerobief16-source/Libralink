import { useState, useEffect } from 'react';
import api, { 
  getStudentNotifications, markNotificationAsRead, getAnnouncements 
} from '../../../utils/api';
import Card from "../../ui/Card";
import EmptyState from "../../ui/EmptyState";
import Button from "../../ui/Button";
import AnnouncementModal from "../../ui/AnnouncementModal";
import { 
  FiMail, FiSend, FiBell, FiCheckCircle, FiClock, FiAlertCircle, 
  FiBook, FiExternalLink, FiCheck, FiFilter, FiCompass, FiLayers, FiMessageSquare,
  FiArrowRight, FiSearch, FiX, FiUser, FiFileText, FiShield
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

  // Direct Email Composer States
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [composerStudents, setComposerStudents] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [activeTemplate, setActiveTemplate] = useState('custom');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendEmailStatus, setSendEmailStatus] = useState(null);

  // Load registered students for live contact card autocomplete
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const schoolId = localStorage.getItem('schoolId');
        if (!schoolId) return;
        const res = await api.get(`/users/school/${schoolId}`);
        const list = (res.data || []).filter(u => {
          const roleId = Number(u.role_id || 0);
          const role = String(u.role_name || u.role || '').toLowerCase();
          if (roleId === 1 || roleId === 2 || roleId === 3) return false;
          if (role.includes('admin') || role.includes('librarian')) return false;
          return true;
        });
        setComposerStudents(list);
      } catch (err) {
        console.warn('Could not load student list for email composer:', err);
      }
    };
    loadStudents();
  }, []);

  const applyTemplate = (templateKey, student = selectedRecipient) => {
    setActiveTemplate(templateKey);
    const studentName = student ? `${student.firstname} ${student.lastname}` : 'Student';
    const studentId = student?.student_number || 'Your ID';
    const studentEmail = student?.email || 'your-portal-email@libralink.com';

    if (templateKey === 'credentials') {
      setEmailSubject(`Your Libralink Library Account Credentials`);
      setEmailBody(`Hello ${studentName},

Here is a reminder of your official Libralink library portal credentials:

Student ID / LRN: ${studentId}
Portal Username: ${studentEmail}

You can access book catalogs, view your borrowing history, and place holds on library materials. If you need assistance or a temporary password reset, please visit the campus circulation desk.

Best regards,
Library Circulation Desk`);
    } else if (templateKey === 'overdue') {
      setEmailSubject(`URGENT: Library Overdue Notice & Return Reminder`);
      setEmailBody(`Dear ${studentName},

Our circulation records indicate that you have one or more library books currently overdue.

Please return your borrowed materials to the circulation counter immediately to avoid accumulating overdue penalties and temporary suspension of circulation privileges.

Thank you for your prompt cooperation.

Library Circulation Counter`);
    } else if (templateKey === 'pickup') {
      setEmailSubject(`Your Requested Library Book is Ready for Pickup`);
      setEmailBody(`Dear ${studentName},

Great news! The library material you requested has been processed and is now waiting for you at the circulation counter.

Please claim your item within 3 business days by presenting your student identification card.

Warm regards,
Campus Library Team`);
    } else {
      setEmailSubject('');
      setEmailBody('');
    }
  };

  const handleSelectRecipient = (student) => {
    setSelectedRecipient(student);
    setRecipientSearch(`${student.firstname} ${student.lastname}`);
    setShowRecipientDropdown(false);
    if (activeTemplate !== 'custom') {
      applyTemplate(activeTemplate, student);
    }
  };

  const handleSendDirectEmail = async (e) => {
    e.preventDefault();
    const targetEmail = selectedRecipient?.personal_email || selectedRecipient?.email || recipientSearch.trim();
    if (!targetEmail) {
      setSendEmailStatus({ type: 'error', text: 'Please specify a recipient email address.' });
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      setSendEmailStatus({ type: 'error', text: 'Subject and message body cannot be empty.' });
      return;
    }

    setSendingEmail(true);
    setSendEmailStatus(null);
    try {
      const recipientName = selectedRecipient ? `${selectedRecipient.firstname} ${selectedRecipient.lastname}` : 'Library Patron';
      const res = await api.post('/notifications/send-email', {
        recipient_email: targetEmail,
        recipient_name: recipientName,
        subject: emailSubject.trim(),
        message: emailBody.trim(),
        template_type: activeTemplate
      });

      if (res.data?.success) {
        setSendEmailStatus({ type: 'success', text: `Email dispatched successfully to ${targetEmail}!` });
        setTimeout(() => {
          setShowEmailComposer(false);
          setSelectedRecipient(null);
          setRecipientSearch('');
          setEmailSubject('');
          setEmailBody('');
          setSendEmailStatus(null);
        }, 2200);
      } else {
        setSendEmailStatus({ type: 'error', text: res.data?.message || 'Failed to dispatch email.' });
      }
    } catch (err) {
      console.error('Error dispatching email:', err);
      setSendEmailStatus({ type: 'error', text: err.response?.data?.message || err.message || 'Error dispatching email.' });
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredRecipientSuggestions = composerStudents.filter(s => {
    if (!recipientSearch.trim()) return false;
    const q = recipientSearch.toLowerCase();
    const fullName = `${s.firstname || ''} ${s.lastname || ''}`.toLowerCase();
    const id = String(s.student_number || '').toLowerCase();
    const email = String(s.email || '').toLowerCase();
    const personal = String(s.personal_email || '').toLowerCase();
    return fullName.includes(q) || id.includes(q) || email.includes(q) || personal.includes(q);
  }).slice(0, 8);

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

        <div className="flex items-center gap-2.5 pb-2">
          {activeInboxTab === 'alerts' && unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors px-2.5 py-1.5 rounded-xl hover:bg-blue-50"
            >
              <FiCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}

          <button
            onClick={() => {
              setShowEmailComposer(true);
              setSendEmailStatus(null);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <FiSend className="w-3.5 h-3.5" />
            <span>Compose Email</span>
          </button>
        </div>
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

      {/* ========================================================= */}
      {/* GMAIL-STYLE DIRECT EMAIL COMPOSER MODAL                   */}
      {/* ========================================================= */}
      {showEmailComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 animate-scale-up ${
            darkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            
            {/* Modal Header */}
            <div className={`p-5 sm:p-6 border-b flex items-start justify-between ${
              darkMode ? "border-slate-800 bg-slate-900/80" : "border-slate-100 bg-slate-50/80"
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                  <FiSend className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight">
                    Compose Library Notice & Email
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Dispatches official correspondence directly to the student's personal Gmail inbox.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowEmailComposer(false);
                  setSendEmailStatus(null);
                }}
                className={`p-2 rounded-xl transition-colors ${
                  darkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                }`}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Composer Form */}
            <form onSubmit={handleSendDirectEmail} className="p-5 sm:p-7 space-y-4">
              
              {/* Alert Status Banner */}
              {sendEmailStatus && (
                <div className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold ${
                  sendEmailStatus.type === 'success'
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800"
                }`}>
                  {sendEmailStatus.type === 'success' ? (
                    <FiCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <FiAlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <span>{sendEmailStatus.text}</span>
                </div>
              )}

              {/* Recipient Field with Gmail-Style Search Dropdown */}
              <div className="relative">
                <label className={`block text-xs font-bold mb-1.5 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                  To (Student Recipient): <span className="text-rose-500">*</span>
                </label>

                {selectedRecipient ? (
                  // Selected Contact Chip
                  <div className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    darkMode ? "bg-slate-800/90 border-blue-500/40" : "bg-blue-50/70 border-blue-200"
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {selectedRecipient.firstname?.charAt(0)}{selectedRecipient.lastname?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold truncate">
                            {selectedRecipient.firstname} {selectedRecipient.lastname}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold">
                            #{selectedRecipient.student_number || 'ID'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate block">
                          {selectedRecipient.personal_email || selectedRecipient.email}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecipient(null);
                        setRecipientSearch('');
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700"
                      title="Clear recipient"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  // Search Input with Live Dropdown
                  <div className="relative">
                    <div className="relative">
                      <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Type student name, student ID / LRN, or Gmail address..."
                        value={recipientSearch}
                        onChange={(e) => {
                          setRecipientSearch(e.target.value);
                          setShowRecipientDropdown(true);
                        }}
                        onFocus={() => setShowRecipientDropdown(true)}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          darkMode 
                            ? "bg-slate-800 border border-slate-700 text-white placeholder-slate-500" 
                            : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400"
                        }`}
                      />
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showRecipientDropdown && recipientSearch.trim() && (
                      <div className={`absolute top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border shadow-xl z-50 divide-y ${
                        darkMode 
                          ? "bg-slate-900 border-slate-700 divide-slate-800" 
                          : "bg-white border-slate-200 divide-slate-100"
                      }`}>
                        {filteredRecipientSuggestions.length > 0 ? (
                          filteredRecipientSuggestions.map((student) => (
                            <button
                              key={student.user_id}
                              type="button"
                              onClick={() => handleSelectRecipient(student)}
                              className={`w-full p-3 text-left flex items-center justify-between gap-3 transition-colors ${
                                darkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                  {student.firstname?.charAt(0)}{student.lastname?.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold truncate">
                                      {student.firstname} {student.lastname}
                                    </span>
                                    {student.student_number && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        #{student.student_number}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-400 truncate block">
                                    {student.course || student.department || 'Enrolled Student'}
                                  </span>
                                </div>
                              </div>

                              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold truncate flex-shrink-0">
                                {student.personal_email || student.email}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="p-3.5 text-center">
                            <p className="text-xs text-slate-400">No matching student found in campus roster.</p>
                            {recipientSearch.includes('@') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowRecipientDropdown(false);
                                }}
                                className="mt-1.5 text-xs text-blue-600 font-semibold hover:underline"
                              >
                                Send directly to "{recipientSearch.trim()}"
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Template Switcher Pills */}
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}>
                  Quick Message Templates:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'credentials', label: '🔑 Credentials Resend' },
                    { id: 'overdue', label: '⚠️ Overdue Notice' },
                    { id: 'pickup', label: '📦 Book Ready for Pickup' },
                    { id: 'custom', label: '✍️ Custom Notice' }
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                        activeTemplate === tpl.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : darkMode
                            ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                            : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70"
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Input */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                  Subject Line: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Your Library Circulation Notice"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? "bg-slate-800 border border-slate-700 text-white placeholder-slate-500" 
                      : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* Message Body */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                  Message Content: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  placeholder="Write the message that will appear in the student's Gmail inbox..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm leading-relaxed transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? "bg-slate-800 border border-slate-700 text-white placeholder-slate-500" 
                      : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className={`pt-3 border-t flex items-center justify-between gap-3 ${
                darkMode ? "border-slate-800" : "border-slate-100"
              }`}>
                <span className={`text-[11px] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Powered by Libralink Gmail SMTP (SSL 465)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailComposer(false);
                      setSendEmailStatus(null);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      darkMode 
                        ? "border-slate-700 text-slate-300 hover:bg-slate-800" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Cancel
                  </button>

                  <Button
                    type="submit"
                    disabled={sendingEmail}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20"
                  >
                    {sendingEmail ? (
                      <span className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Dispatching to Gmail...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <FiSend className="w-3.5 h-3.5" />
                        Send Notice
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInbox;
