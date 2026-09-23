import { useState, useEffect, useRef } from 'react';
import { 
  FiBell, FiX, FiCheckCircle, FiXCircle, FiBook, FiClock, 
  FiAlertTriangle, FiCheck, FiInbox
} from 'react-icons/fi';
import { useNotifications } from '../../context/NotificationContext';
import { formatSmartTime, formatPhilippineFullTooltip } from '../../utils/timeUtils';
import { getBackendAssetUrl } from '../../utils/api';

// Map notification type → icon (no emojis)
const getTypeIcon = (type) => {
  const t = String(type || '').toLowerCase();
  if (t.includes('approved') || t.includes('returned') || t.includes('confirmed'))
    return <FiCheckCircle className="w-3.5 h-3.5 text-slate-500" />;
  if (t.includes('rejected') || t.includes('declined') || t.includes('overdue'))
    return <FiXCircle className="w-3.5 h-3.5 text-slate-500" />;
  if (t.includes('ready') || t.includes('pickup') || t.includes('reminder') || t.includes('cancel'))
    return <FiAlertTriangle className="w-3.5 h-3.5 text-slate-500" />;
  return <FiBook className="w-3.5 h-3.5 text-slate-500" />;
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return 'LL';
};

const NotificationPopup = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [visibleToast, setVisibleToast] = useState(null);
  const panelRef = useRef(null);

  // Toast: show latest unread for 6 s
  useEffect(() => {
    if (unreadCount > 0 && notifications.length > 0) {
      const latest = notifications[0];
      if (!latest.read && !latest.shown) {
        setVisibleToast(latest);
        const timer = setTimeout(() => setVisibleToast(null), 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [notifications, unreadCount]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) refreshNotifications();
  };

  return (
    <>
      {/* ── Toast notification (top-right corner) ── */}
      {visibleToast && (
        <div className="fixed top-20 right-4 z-[9990] w-80 max-w-[calc(100vw-2rem)] pointer-events-auto">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-3.5 flex items-start gap-3">
            {/* Avatar */}
            <div className="relative shrink-0">
              {visibleToast.profile_picture ? (
                <img
                  src={getBackendAssetUrl(visibleToast.profile_picture)}
                  alt={visibleToast.sender_name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-9 h-9 rounded-full bg-slate-700 text-white font-bold text-[11px] flex items-center justify-center border border-slate-200 ${visibleToast.profile_picture ? 'hidden' : 'flex'}`}>
                {getInitials(visibleToast.sender_name)}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-slate-100">
                {getTypeIcon(visibleToast.type)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs font-semibold text-slate-900 leading-tight">{visibleToast.title}</p>
                <button
                  onClick={() => setVisibleToast(null)}
                  className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5 rounded"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">{visibleToast.message}</p>
              <div className="flex items-center justify-between mt-2">
                <span
                  className="text-[10px] text-slate-400 font-medium flex items-center gap-1"
                  title={formatPhilippineFullTooltip(visibleToast.createdAt || visibleToast.created_at)}
                >
                  <FiClock className="w-2.5 h-2.5" />
                  {formatSmartTime(visibleToast.createdAt || visibleToast.created_at)}
                </span>
                <button
                  onClick={() => { markAsRead(visibleToast.id); setVisibleToast(null); }}
                  className="text-[10px] font-semibold text-slate-500 hover:text-slate-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bell trigger button ── */}
      <div className="relative z-20">
        <button
          onClick={handleOpen}
          className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition-all relative text-white"
          aria-label="Notifications"
          title="Notifications"
        >
          <FiBell className="w-5 h-5 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full h-[18px] min-w-[18px] px-0.5 flex items-center justify-center border-2 border-white shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* ── Fixed overlay panel ── */}
        {isOpen && (
          <>
            {/* Transparent backdrop for click-to-close */}
            <div
              className="fixed inset-0 z-[9990]"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <div
              ref={panelRef}
              className="fixed top-16 right-4 z-[9995] w-[340px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-5rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
              style={{ animation: 'npSlideDown 0.15s ease-out' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <FiBell className="w-4 h-4 text-slate-600" />
                  <span className="font-semibold text-sm text-slate-800">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                      title="Mark all as read"
                    >
                      <FiCheck className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Close"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                      <FiInbox className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">No notifications yet</p>
                    <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.read;
                    const profilePic = n.profile_picture || n.student_profile_picture;
                    const senderName = n.sender_name || 'Library System';

                    return (
                      <div
                        key={n.id}
                        className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-slate-50 relative ${isUnread ? 'bg-slate-50/60' : 'bg-white'}`}
                        onClick={() => markAsRead(n.id)}
                      >
                        {/* Unread dot */}
                        {isUnread && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        )}

                        {/* Avatar */}
                        <div className="relative shrink-0 mt-0.5 ml-1">
                          {profilePic ? (
                            <img
                              src={getBackendAssetUrl(profilePic)}
                              alt={senderName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-8 h-8 rounded-full bg-slate-700 text-white font-bold text-[10px] flex items-center justify-center border border-slate-200 ${profilePic ? 'hidden' : 'flex'}`}>
                            {getInitials(senderName)}
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-slate-100">
                            {getTypeIcon(n.type)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className={`text-xs font-semibold leading-tight ${isUnread ? 'text-slate-900' : 'text-slate-600'}`}>
                              {n.title}
                            </p>
                            <span
                              className="text-[10px] text-slate-400 shrink-0 font-medium ml-2 whitespace-nowrap"
                              title={formatPhilippineFullTooltip(n.createdAt || n.created_at)}
                            >
                              {formatSmartTime(n.createdAt || n.created_at)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          {n.sender_name && (
                            <p className="text-[10px] text-slate-400 mt-1">By {n.sender_name}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-slate-100 shrink-0 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Philippine Standard Time (UTC+8)</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes npSlideDown {
          from { opacity: 0; transform: translateY(-10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
};

export default NotificationPopup;
