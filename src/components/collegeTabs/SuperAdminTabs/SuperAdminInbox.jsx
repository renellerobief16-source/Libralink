import { useState, useMemo } from 'react';
import { 
  FiX, FiClock, FiCheckCircle, FiInfo, FiAlertTriangle, FiBell, 
  FiCheck, FiTrash2, FiFilter, FiUser, FiSend, FiGlobe, 
  FiRadio, FiMail, FiCheckSquare, FiInbox, FiShield
} from 'react-icons/fi';
import { 
  markNotificationAsRead, 
  deleteNotification, 
  deleteAllNotifications 
} from '../../../utils/api';
import { 
  Button, Card, Modal, EmptyState, IconButton, StatusBadge, AnnouncementModal 
} from '../../ui';
import { ConfirmationOverlay } from '../../common';

function SuperAdminInbox({ notifications = [], onNotificationsChange }) {
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  const getRoleDisplay = (role, schoolCode) => {
    if (!role) return '';
    const roleLower = role.toLowerCase();
    let roleDisplay = '';
    
    if (roleLower === 'super_admin' || roleLower === 'super admin') {
      roleDisplay = 'SUPER ADMIN';
    } else if (roleLower === 'admin_librarian' || roleLower === 'admin-librarian' || roleLower === 'librarian admin') {
      roleDisplay = 'ADMIN-LIBRARIAN';
    } else if (roleLower === 'librarian') {
      roleDisplay = 'LIBRARIAN';
    } else if (roleLower === 'student') {
      roleDisplay = 'STUDENT';
    } else if (roleLower === 'admin') {
      roleDisplay = 'ADMIN';
    } else {
      roleDisplay = role.toUpperCase();
    }
    
    if (schoolCode && roleLower !== 'super_admin' && roleLower !== 'super admin') {
      return `${schoolCode} • ${roleDisplay}`;
    }
    
    return roleDisplay;
  };

  const getNotificationIcon = (type = 'info') => {
    const icons = {
      info: <FiInfo className="w-5 h-5 text-blue-500" />,
      success: <FiCheckCircle className="w-5 h-5 text-emerald-500" />,
      warning: <FiAlertTriangle className="w-5 h-5 text-amber-500" />,
      error: <FiAlertTriangle className="w-5 h-5 text-rose-500" />,
      announcement: <FiRadio className="w-5 h-5 text-purple-500" />,
      broadcast: <FiGlobe className="w-5 h-5 text-blue-600" />,
      default: <FiBell className="w-5 h-5 text-slate-500" />
    };
    return icons[type] || icons.default;
  };

  const getNotificationBadgeColor = (type = 'info') => {
    const colors = {
      info: 'bg-blue-50 text-blue-700 border-blue-200',
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      warning: 'bg-amber-50 text-amber-700 border-amber-200',
      error: 'bg-rose-50 text-rose-700 border-rose-200',
      announcement: 'bg-purple-50 text-purple-700 border-purple-200',
      broadcast: 'bg-blue-50 text-blue-700 border-blue-200',
      default: 'bg-slate-50 text-slate-700 border-slate-200'
    };
    return colors[type] || colors.default;
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Recent';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'unread') return !n.read;
      if (selectedFilter === 'read') return n.read;
      return true;
    });
  }, [notifications, selectedFilter]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.notification_id || notification.id);
      if (onNotificationsChange) onNotificationsChange();
    }
    setSelectedNotification(notification);
    setShowNotificationModal(true);
  };

  const handleMarkAsRead = async (notification, e) => {
    e.stopPropagation();
    await markNotificationAsRead(notification.notification_id || notification.id);
    if (onNotificationsChange) onNotificationsChange();
  };

  const handleDeleteNotification = async (notification, e) => {
    if (e) e.stopPropagation();
    await deleteNotification(notification.notification_id || notification.id);
    if (onNotificationsChange) onNotificationsChange();
  };

  const handleDeleteAllNotifications = async () => {
    await deleteAllNotifications();
    setShowDeleteAllConfirmation(false);
    if (onNotificationsChange) onNotificationsChange();
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => markNotificationAsRead(n.notification_id || n.id)));
    if (onNotificationsChange) onNotificationsChange();
  };

  return (
    <div className="space-y-6 animate-slide-up pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. CONSORTIUM EXECUTIVE HERO BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/40">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <FiRadio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                Network Broadcast Dispatcher
              </span>
              {unreadCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  {unreadCount} Unread Alert{unreadCount !== 1 ? 's' : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <FiCheckCircle className="w-3 h-3 text-emerald-400" />
                  All Messages Reviewed
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              Consortium Communications & Inbox
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Consolidated audit alerts, inter-library transit requests, system events, and campus-wide broadcasting controls.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <FiCheckSquare className="w-3.5 h-3.5 text-blue-400" />
                Mark All Read
              </button>
            )}
            <Button
              onClick={() => setShowAnnouncementModal(true)}
              className="!bg-blue-600 hover:!bg-blue-500 !text-white !font-semibold !rounded-xl !px-4 !py-2.5 !shadow-lg !shadow-blue-600/30 flex items-center gap-2 text-xs"
            >
              <FiSend className="w-4 h-4" />
              New Network Broadcast
            </Button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FILTER BAR & BULK ACTIONS (Clean White Surface)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-slate-400" />
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            {[
              { key: 'all', label: 'All Inbound', count: notifications.length },
              { key: 'unread', label: 'Unread', count: unreadCount },
              { key: 'read', label: 'Archived', count: notifications.length - unreadCount }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setSelectedFilter(f.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  selectedFilter === f.key
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{f.label}</span>
                {f.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    selectedFilter === f.key
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={() => setShowDeleteAllConfirmation(true)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors self-end sm:self-auto"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
            Clear All Notifications
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. NOTIFICATIONS STREAM (Clean White Cards)
      ───────────────────────────────────────────────────────────── */}
      {filteredNotifications.length === 0 ? (
        <Card padding="lg" className="text-center py-16">
          <EmptyState
            icon={<FiInbox className="w-14 h-14 text-slate-300 mx-auto" />}
            title={selectedFilter === 'unread' ? "Zero unread alerts" : "Inbox is empty"}
            description={
              selectedFilter === 'unread'
                ? "You have acknowledged all multi-campus alerts and notifications."
                : "No telemetry or system dispatches logged in this view."
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const isUnread = !notification.read;
            const badgeClasses = getNotificationBadgeColor(notification.type);

            return (
              <div
                key={notification.notification_id || notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`group relative bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md ${
                  isUnread
                    ? 'border-blue-300 bg-blue-50/20 hover:border-blue-400'
                    : 'border-slate-200/90 hover:border-slate-300 opacity-90 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon Avatar */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${badgeClasses}`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-bold leading-tight ${
                          isUnread 
                            ? 'text-slate-900 text-base' 
                            : 'text-slate-700 text-sm'
                        }`}>
                          {notification.title}
                        </h3>
                        {isUnread && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                            NEW
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                        <FiClock className="w-3 h-3" />
                        {formatTimeAgo(notification.created_at)}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed mb-3">
                      {notification.message}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {notification.sender_role ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-100 text-slate-700">
                            <FiUser className="w-3 h-3 text-slate-400" />
                            {getRoleDisplay(notification.sender_role, notification.school_code)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-slate-500 bg-slate-100">
                            <FiShield className="w-3 h-3 text-blue-500" />
                            System Dispatch
                          </span>
                        )}
                        {notification.type && (
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${badgeClasses}`}>
                            {notification.type}
                          </span>
                        )}
                      </div>

                      {/* Quick actions */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {isUnread && (
                          <button
                            onClick={(e) => handleMarkAsRead(notification, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Mark read"
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteNotification(notification, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete notification"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. NOTIFICATION DETAIL MODAL
      ───────────────────────────────────────────────────────────── */}
      {showNotificationModal && selectedNotification && (
        <Modal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          title={
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${getNotificationBadgeColor(selectedNotification.type)}`}>
                {getNotificationIcon(selectedNotification.type)}
              </div>
              <span className="text-base font-bold text-slate-900 truncate">
                {selectedNotification.title}
              </span>
            </div>
          }
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="danger"
                onClick={async () => {
                  await handleDeleteNotification(selectedNotification);
                  setShowNotificationModal(false);
                }}
                className="!text-xs"
              >
                <FiTrash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Alert
              </Button>
              <Button 
                onClick={() => setShowNotificationModal(false)}
                className="!bg-blue-600 hover:!bg-blue-500 !text-white !text-xs !font-semibold"
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {selectedNotification.sender_name && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FiUser className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {selectedNotification.sender_name}
                  </div>
                  {selectedNotification.sender_role && (
                    <div className="text-xs text-blue-600 font-mono mt-0.5">
                      {getRoleDisplay(selectedNotification.sender_role, selectedNotification.school_code)}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                {selectedNotification.message}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <FiClock className="w-3.5 h-3.5 text-slate-400" />
                {selectedNotification.created_at ? new Date(selectedNotification.created_at).toLocaleString() : 'N/A'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold border ${getNotificationBadgeColor(selectedNotification.type)}`}>
                {selectedNotification.type || 'Notice'}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. CONSORTIUM ANNOUNCEMENT BROADCAST MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnnouncementModal
        open={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        superAdmin={true}
        onCreated={() => {
          if (onNotificationsChange) onNotificationsChange();
        }}
      />

      {/* ─────────────────────────────────────────────────────────────
          6. DELETE ALL CONFIRMATION OVERLAY
      ───────────────────────────────────────────────────────────── */}
      <ConfirmationOverlay
        isOpen={showDeleteAllConfirmation}
        onClose={() => setShowDeleteAllConfirmation(false)}
        onConfirm={handleDeleteAllNotifications}
        title="Clear All Notifications"
        message="Are you sure you want to delete all notifications from your consortium inbox? This cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default SuperAdminInbox;
