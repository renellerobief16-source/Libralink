import React, { useState, useEffect, useRef, useCallback } from "react";

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "../../../context/NotificationContext";
import { API_ORIGIN } from "../../../utils/api";
import StudentInbox from "./StudentInbox";
import StudentHistory from "./StudentHistory";
import StudentSettings from "./StudentSettings";
import StudentFavorite from "./StudentFavorite";
import StudentProfile from "./StudentProfile";
import { StudentHeaderActions } from "./StudentHeaderActions";
import { StudentHeaderSearch } from "./StudentHeaderSearch";
import { useBorrowingCartCount, useOpenBorrowingCart, useIsCartDrawerOpen } from "../../../utils/studentCart";

import {
  Book,
  ChevronRight,
  ChevronLeft,
  User,
  Home,
  Search,
  Heart,
  Mail,
  History as ClockIcon,
  Settings,
  LogOut,
  Plus,
  X,
  Bell,
  ShoppingCart,
} from "lucide-react";

const navigation = [
  {
    name: "Home",
    path: "/studentpage",
    icon: "/home-button.png",
    mobileIcon: Home,
    primary: true,
  },
  {
    name: "Search",
    path: "/studentpage/search",
    icon: "/search.png",
    mobileIcon: Search,
    primary: true,
  },
  {
    name: "Favorites",
    path: "/studentpage/favorites",
    icon: "/heart.png",
    mobileIcon: Heart,
    primary: true,
  },
  {
    name: "Inbox",
    path: "/studentpage/inbox",
    icon: "/email.png",
    mobileIcon: Mail,
    primary: true,
  },
  {
    name: "History",
    path: "/studentpage/history",
    icon: "/history.png",
    mobileIcon: ClockIcon,
    primary: false,
  },
  {
    name: "Profile",
    path: "/studentpage/profile",
    icon: "/user.png",
    mobileIcon: User,
    primary: true,
    isProfilePicture: true,
  },
  {
    name: "Settings",
    path: "/studentpage/settings",
    icon: "/settings.png",
    mobileIcon: Settings,
    primary: false,
  },
];

const studentSearchFeatures = [
  {
    label: "Search books",
    description: "Find books by title, author, or subject",
    path: "/studentpage/search",
    icon: Search,
  },
  {
    label: "Favorites",
    description: "View your saved books",
    path: "/studentpage/favorites",
    icon: Heart,
  },
  {
    label: "Inbox",
    description: "View notifications and updates",
    path: "/studentpage/inbox",
    icon: Mail,
  },
  {
    label: "History",
    description: "View your borrowing history",
    path: "/studentpage/history",
    icon: ClockIcon,
  },
  {
    label: "Profile",
    description: "Manage your personal information",
    path: "/studentpage/profile",
    icon: User,
  },
  {
    label: "Settings",
    description: "Manage your account settings",
    path: "/studentpage/settings",
    icon: Settings,
  },
];

/* ─── MobileCartButton ──────────────────────────────────────────────────────
 * A compact borrowing cart button with live badge counter for mobile header.
 * ─────────────────────────────────────────────────────────────────────────── */
function MobileCartButton() {
  const cartCount = useBorrowingCartCount();
  const openCart = useOpenBorrowingCart();
  const isCartOpen = useIsCartDrawerOpen();

  return (
    <button
      type="button"
      onClick={openCart}
      className="md:hidden relative flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-600 active:scale-95"
      aria-label={`Borrowing cart with ${cartCount} books`}
      title="Borrowing Cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {!isCartOpen && cartCount > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white leading-none shadow-xs ring-2 ring-white transition-opacity">
          {cartCount > 9 ? "9+" : cartCount}
        </span>
      )}
    </button>
  );
}

/* ─── MobileBellButton ──────────────────────────────────────────────────────
 * A sleek notification bell with an anchored compact dropdown for mobile.
 * ─────────────────────────────────────────────────────────────────────────── */
function MobileBellButton() {
  const { notifications = [], unreadCount = 0, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Close on click outside or escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const filtered = (notifications || []).filter((n) => {
    if (filter === "unread") return !n.read;
    return true;
  });

  const handleNotificationClick = (item) => {
    if (!item.read) markAsRead(item.id);
    setIsOpen(false);
    navigate("/studentpage/inbox");
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate("/studentpage/inbox");
  };

  return (
    <div ref={containerRef} className="relative md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
          isOpen
            ? "bg-blue-50 text-blue-600 ring-2 ring-blue-500/30"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white leading-none shadow-xs ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* COMPACT NOTIFICATION DROPDOWN */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-[min(320px,calc(100vw-20px))] rounded-2xl border border-slate-200/90 bg-white/98 shadow-[0_16px_40px_-8px_rgba(15,23,42,0.22)] backdrop-blur-xl z-[100] animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-100 bg-white">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                filter === "all"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({(notifications || []).length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                filter === "unread"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Scrollable Notification List */}
          <div className="max-h-[250px] overflow-y-auto overscroll-contain divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="py-7 text-center">
                <Bell className="h-6 w-6 text-slate-300 mx-auto mb-1.5 stroke-[1.5]" />
                <p className="text-xs font-medium text-slate-600">
                  {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">We'll alert you when books are ready or updated.</p>
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`flex items-start gap-2.5 p-2.5 cursor-pointer transition hover:bg-slate-50 ${
                    !item.read ? "bg-blue-50/40" : ""
                  }`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 mt-0.5">
                    <Bell className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className={`text-xs truncate ${!item.read ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                        {item.title}
                      </p>
                      {!item.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug mt-0.5">
                      {item.message}
                    </p>
                    {item.createdAt && (
                      <span className="text-[9px] text-slate-400 mt-1 block">
                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: View All in Inbox */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-2 text-center">
            <button
              type="button"
              onClick={handleViewAll}
              className="w-full rounded-xl py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
            >
              View all in Inbox →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudentBottomNav() {
  const { unreadCount = 0 } = useNotifications();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const refreshCurrentUser = () => {
      try {
        setCurrentUser(JSON.parse(localStorage.getItem("currentUser") || "null"));
      } catch {
        setCurrentUser(null);
      }
    };
    window.addEventListener("libralink-user-changed", refreshCurrentUser);
    window.addEventListener("storage", refreshCurrentUser);
    return () => {
      window.removeEventListener("libralink-user-changed", refreshCurrentUser);
      window.removeEventListener("storage", refreshCurrentUser);
    };
  }, []);

  const profileImage = currentUser?.profile_picture || currentUser?.profile_image || "";
  const getProfilePictureUrl = (picture) => {
    if (!picture) return "";
    if (picture.startsWith("http://") || picture.startsWith("https://") || picture.startsWith("data:") || picture.startsWith("blob:")) return picture;
    if (picture.startsWith("/")) return `${API_ORIGIN}${picture}`;
    return `${API_ORIGIN}/${picture}`;
  };
  const profileImageUrl = getProfilePictureUrl(profileImage);
  const initial = (currentUser?.first_name || currentUser?.name || "S").charAt(0).toUpperCase();

  const tabs = [
    { to: "/studentpage", end: true, icon: Home, label: "Home" },
    { to: "/studentpage/search", icon: Search, label: "Search" },
    { to: "/studentpage/favorites", icon: Heart, label: "Favorites" },
    { to: "/studentpage/inbox", icon: Bell, label: "Inbox", badge: unreadCount, badgeColor: "bg-rose-500" },
    { to: "/studentpage/profile", icon: null, label: "Me", isProfile: true },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Student navigation"
    >
      {/* Blur backdrop */}
      <div className="border-t border-slate-200/70 bg-white/96 backdrop-blur-2xl shadow-[0_-1px_0_0_rgba(0,0,0,0.05)]">
        <div className="grid h-[58px] grid-cols-5 items-center">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `group relative flex flex-col items-center justify-center gap-[3px] h-full w-full transition-all duration-200 active:scale-90 ${
                  isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator — thin line at top */}
                  <span
                    className={`absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-b-full transition-all duration-300 ${
                      isActive ? "bg-blue-600 opacity-100" : "opacity-0"
                    }`}
                  />

                  {/* Icon */}
                  <div className="relative flex items-center justify-center">
                    {tab.isProfile ? (
                      profileImageUrl ? (
                        <img
                          src={profileImageUrl}
                          alt="Profile"
                          className={`h-[22px] w-[22px] rounded-full object-cover transition-all duration-200 ${
                            isActive ? "ring-2 ring-blue-600 ring-offset-1" : "ring-1 ring-slate-300"
                          }`}
                        />
                      ) : (
                        <div
                          className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200 ${
                            isActive
                              ? "bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-1"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {initial}
                        </div>
                      )
                    ) : (
                      <tab.icon
                        className={`transition-all duration-200 ${
                          isActive ? "h-[22px] w-[22px] text-blue-600" : "h-[21px] w-[21px] text-slate-400"
                        } ${
                          tab.icon === Heart && isActive ? "fill-current" : ""
                        }`}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />
                    )}

                    {/* Badge */}
                    {tab.badge > 0 && (
                      <span className="absolute -right-2 -top-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-[3px] text-[8px] font-bold leading-none text-white shadow-xs ring-1 ring-white">
                        {tab.badge > 9 ? "9+" : tab.badge}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-[10px] leading-none tracking-tight transition-all duration-200 ${
                      isActive ? "font-semibold text-blue-600" : "font-normal text-slate-400"
                    }`}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

function StudentFloatingCart() {
  const cartCount = useBorrowingCartCount();
  const openCart = useOpenBorrowingCart();
  const isCartOpen = useIsCartDrawerOpen();
  const buttonRef = React.useRef(null);
  const dragRef = React.useRef(null);
  const movedRef = React.useRef(false);
  const prevCountRef = React.useRef(cartCount);
  const [isDragging, setIsDragging] = useState(false);
  const [badgeBouncing, setBadgeBouncing] = useState(false);

  const [position, setPosition] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('studentCartPosition') || 'null');
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        return {
          x: Math.max(12, Math.min(saved.x, window.innerWidth - 68)),
          y: Math.max(12, Math.min(saved.y, window.innerHeight - 130)),
        };
      }
    } catch {
      // fallback
    }
    return {
      x: Math.max(12, window.innerWidth - 68),
      y: Math.max(12, window.innerHeight - (window.innerWidth >= 768 ? 100 : 140)),
    };
  });

  const keepOnScreen = React.useCallback((x, y) => ({
    x: Math.max(12, Math.min(x, window.innerWidth - 68)),
    y: Math.max(12, Math.min(y, window.innerHeight - 130)),
  }), []);

  const snapToNearestSide = React.useCallback((currentPosition) => {
    const safePosition = keepOnScreen(currentPosition.x, currentPosition.y);
    const cartCenter = safePosition.x + 27;
    const screenCenter = window.innerWidth / 2;

    return {
      ...safePosition,
      x: cartCenter < screenCenter ? 12 : window.innerWidth - 68,
    };
  }, [keepOnScreen]);

  // Keep on screen on window resize & snap
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => snapToNearestSide(prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [snapToNearestSide]);

  // Pop-up bounce animation whenever books are added to cart
  useEffect(() => {
    if (cartCount > prevCountRef.current) {
      setBadgeBouncing(true);
      const timer = setTimeout(() => setBadgeBouncing(false), 900);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = cartCount;
  }, [cartCount]);

  // Global pointer event listeners during drag for silky smooth, weightless 0ms tracking
  useEffect(() => {
    if (!isDragging) return;

    // Completely prevent window and mobile viewport scrolling while dragging the cart
    const preventTouchScroll = (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    window.addEventListener('touchmove', preventTouchScroll, { passive: false });
    const originalOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = 'none';

    const handlePointerMove = (event) => {
      if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;

      if (event.cancelable) {
        event.preventDefault();
      }

      const movement = Math.hypot(
        event.clientX - dragRef.current.startX,
        event.clientY - dragRef.current.startY
      );
      if (!dragRef.current.hasMoved && movement < 3) return;

      dragRef.current.hasMoved = true;
      movedRef.current = true;

      const nextX = event.clientX - dragRef.current.offsetX;
      const nextY = event.clientY - dragRef.current.offsetY;
      const safe = keepOnScreen(nextX, nextY);

      dragRef.current.currentX = safe.x;
      dragRef.current.currentY = safe.y;

      // Direct GPU transform update for instant 120fps tracking with zero lag/weight
      if (buttonRef.current) {
        buttonRef.current.style.transform = `translate3d(${safe.x}px, ${safe.y}px, 0)`;
      }
    };

    const handlePointerUp = (event) => {
      if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;

      try {
        if (buttonRef.current?.hasPointerCapture(event.pointerId)) {
          buttonRef.current.releasePointerCapture(event.pointerId);
        }
      } catch {
        // ignore
      }

      const finalPosition = snapToNearestSide({
        x: dragRef.current.currentX,
        y: dragRef.current.currentY,
      });

      dragRef.current = null;
      setIsDragging(false);
      setPosition(finalPosition);

      try {
        localStorage.setItem('studentCartPosition', JSON.stringify(finalPosition));
      } catch {
        // ignore
      }

      // Smooth magnetic snap to side without size change
      if (buttonRef.current) {
        buttonRef.current.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.25s ease, box-shadow 0.25s ease';
        buttonRef.current.style.transform = `translate3d(${finalPosition.x}px, ${finalPosition.y}px, 0)`;
      }

      if (movedRef.current) {
        window.setTimeout(() => {
          movedRef.current = false;
        }, 80);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('touchmove', preventTouchScroll);
      document.body.style.overscrollBehavior = originalOverscroll;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, keepOnScreen, snapToNearestSide]);

  const handlePointerDown = (event) => {
    // Only respond to primary mouse button or touch
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    if (event.cancelable) {
      event.preventDefault();
    }

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      startX: event.clientX,
      startY: event.clientY,
      currentX: position.x,
      currentY: position.y,
      hasMoved: false,
    };
    movedRef.current = false;
    setIsDragging(true);

    // Disable CSS transition immediately for zero latency response without scaling
    if (buttonRef.current) {
      buttonRef.current.style.transition = 'none';
      buttonRef.current.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    }
  };

  const handleCartClick = (e) => {
    if (movedRef.current) {
      e.preventDefault();
      return;
    }
    openCart();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleCartClick}
      onPointerDown={handlePointerDown}
      onTouchStart={(e) => {
        if (e.cancelable) e.stopPropagation();
      }}
      onTouchMove={(e) => {
        if (isDragging && e.cancelable) e.preventDefault();
      }}
      onContextMenu={(event) => event.preventDefault()}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none',
        left: 0,
        top: 0,
        transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.25s ease, box-shadow 0.25s ease',
      }}
      className={`fixed z-[70] flex h-12 w-12 sm:h-[50px] sm:w-[50px] touch-none select-none items-center justify-center rounded-2xl border border-white/20 bg-[#0A2540] text-white shadow-md will-change-transform ${
        isDragging
          ? 'shadow-lg cursor-grabbing opacity-100'
          : 'opacity-50 hover:opacity-100 cursor-grab active:scale-95 transition-opacity'
      }`}
      aria-label={`Open borrowing list, ${cartCount} books in cart`}
      title="Borrowing Cart (Drag to move)"
    >
      <ShoppingCart className="h-5 w-5 text-white" aria-hidden="true" />

      {/* Clean iOS-style red notification badge on top right - hidden while cart drawer is open */}
      {!isCartOpen && cartCount > 0 && (
        <span
          className={`absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-[#0A2540] transition-all duration-200 ${
            badgeBouncing ? 'scale-110' : 'scale-100'
          }`}
        >
          {cartCount > 99 ? '99+' : cartCount}
        </span>
      )}
    </button>
  );
}

export function StudentBottomDock() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const primaryNav = navigation.filter((item) => item.primary);

  const secondaryNav = navigation.filter((item) => !item.primary);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  const profileImage =
    currentUser?.profile_picture ||
    currentUser?.profile_image ||
    "";

  const getProfilePictureUrl = (picture) => {
    if (!picture) return "";
    if (
      picture.startsWith("http://") ||
      picture.startsWith("https://") ||
      picture.startsWith("data:") ||
      picture.startsWith("blob:")
    ) {
      return picture;
    }
    if (picture.startsWith("/")) return `${API_ORIGIN}${picture}`;
    return `${API_ORIGIN}/${picture}`;
  };

  const profileImageUrl = getProfilePictureUrl(profileImage);

  return (
    <nav
      className="



        fixed



        bottom-4



        left-1/2



        -translate-x-1/2



        z-[1000]







        w-[calc(100%-32px)]



        max-w-[360px]



        md:w-auto



        md:max-w-none



        md:bottom-6







        flex



        items-center



        gap-1







        px-2.5



        py-2







        rounded-full







        md:bg-[#2D8AC4]/70



        md:backdrop-blur-xl



        md:border



        md:border-white/25



        md:shadow-[0_10px_30px_rgba(0,0,0,0.15)]







        bg-white



        shadow-[0_8px_32px_rgba(0,0,0,0.12)]



        border border-gray-100







        select-none



      "

      aria-label="Student Navigation"
    >
      {/* Desktop: Show all icons */}

      <div className="hidden md:flex items-center gap-1">
        {navigation.map((item) => (
          <DockItem key={item.name} item={item} />
        ))}
      </div>

      {/* Mobile: Floating white pill with 5 items */}

      <div className="flex md:hidden items-center justify-between w-full px-2">
        {/* Home */}

        <NavLink
          to="/studentpage"

          end

          className={({ isActive }) => `



            flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all



            ${isActive ? "text-[#2563EB]" : "text-gray-400"}



          `}
        >
          <Home className="w-5 h-5" />

          <span className="text-[10px] font-medium">Home</span>
        </NavLink>

        {/* Search */}

        <NavLink
          to="/studentpage/search"

          className={({ isActive }) => `



            flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all



            ${isActive ? "text-[#2563EB]" : "text-gray-400"}



          `}
        >
          <Search className="w-5 h-5" />

          <span className="text-[10px] font-medium">Search</span>
        </NavLink>

        {/* Add - Large elevated blue circular button */}

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}

          className="



            -mt-6



            flex items-center justify-center



            w-14 h-14



            rounded-full



            bg-[#2563EB]



            shadow-[0_4px_20px_rgba(37,99,235,0.4)]



            border-4 border-white



            transition-transform



            hover:scale-105



            active:scale-95



          "
        >
          <Plus className="w-7 h-7 text-white" />
        </button>

        {/* Inbox */}

        <NavLink
          to="/studentpage/inbox"

          className={({ isActive }) => `



            flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all



            ${isActive ? "text-[#2563EB]" : "text-gray-400"}



          `}
        >
          <Mail className="w-5 h-5" />

          <span className="text-[10px] font-medium">Inbox</span>
        </NavLink>

        {/* Profile Picture */}

        {mobileMenuOpen && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-56 rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
            <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-4 py-3">
              <p className="text-white font-semibold text-sm">More Options</p>
            </div>

            {secondaryNav.map((item) => (
              <NavLink
                key={item.name}

                to={item.path}

                onClick={() => setMobileMenuOpen(false)}

                className="flex items-center gap-3 px-4 py-3.5 text-sm text-slate-700 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <item.mobileIcon className="w-4 h-4 text-blue-600" />
                </div>

                <span className="font-medium">{item.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

function DockItem({ item }) {
  const [hovered, setHovered] = useState(false);

  const MobileIcon = item.mobileIcon;

  return (
    <NavLink
      to={item.path}

      end={item.path === "/studentpage"}

      className="relative"

      onMouseEnter={() => setHovered(true)}

      onMouseLeave={() => setHovered(false)}
    >
      {({ isActive }) => (
        <div className="relative flex items-center justify-center">
          {/* Desktop PNG Icon */}

          <div className="hidden md:flex items-center justify-center w-12 h-12">
            <img
              src={item.icon}

              alt={item.name}

              draggable="false"

              className={`



                w-8



                h-8



                object-contain







                transition-opacity



                duration-200



                ease-out







                ${isActive ? "opacity-100" : hovered ? "opacity-75" : "opacity-50"}



              `}
            />
          </div>

          {/* Mobile SVG Icon */}

          <div className="flex md:hidden items-center justify-center w-11 h-11">
            <MobileIcon
              className={`



                w-6



                h-6



                text-slate-800







                transition-opacity



                duration-200



                ease-out







                ${isActive ? "opacity-100" : hovered ? "opacity-75" : "opacity-50"}



              `}
            />
          </div>

          {/* Active Dot Indicator */}

          {isActive && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#2563EB]" />
          )}

          {/* Desktop Tooltip */}

          {hovered && (
            <div className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-3 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg whitespace-nowrap">
              {item.name}
            </div>
          )}
        </div>
      )}
    </NavLink>
  );
}

export function StudentHeader({ userInfo, onLogout, panelOpen = false }) {
  const [searchQuery, setSearchQuery] = useState("");

  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  const navigate = useNavigate();

  // Load books on mount

  useEffect(() => {
    return undefined;

    const loadBooks = async () => {
      const schoolId = localStorage.getItem("schoolId");

      if (!schoolId) {
        console.log("No schoolId found in localStorage");

        return;
      }

      try {
        const response = await api.get(`/books/school?school_id=${schoolId}`);

        console.log("Books API response:", response.data);

        if (response.data) {
          const mappedBooks = (response.data || []).map((book) => ({
            id: book.book_id,

            title: book.title || "Untitled",

            author: book.author || "Unknown Author",

            category: book.category || "General",

            available: book.real_time_status === "available",

            available_copies: book.available_copies || 0,

            total_copies: book.total_copies || 0,
          }));

          console.log("Mapped books:", mappedBooks);

          setBooks(mappedBooks);
        }
      } catch (error) {
        console.error("Unable to load books:", error);
      }
    };

    loadBooks();
  }, []);

  // Filter books based on search query

  useEffect(() => {
    return undefined;

    if (searchQuery.length > 0) {
      const filtered = books
        .filter(
          (book) =>
            book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
            book.category.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .slice(0, 5); // Show max 5 results

      setFilteredBooks(filtered);
    } else {
      setFilteredBooks([]);
    }
  }, [searchQuery]);


  const handleSearch = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate("/studentpage/search", { state: { query: searchQuery.trim() } });
      setShowSearchSuggestions(false);
    }
  };

  const handleSearchButtonClick = () => {
    if (searchQuery.trim()) {
      navigate("/studentpage/search", { state: { query: searchQuery.trim() } });
      setShowSearchSuggestions(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");

    setShowSearchSuggestions(false);
  };

  const handleSearchFocus = () => {
    if (searchQuery.length > 0) {
      setShowSearchSuggestions(true);
    }
  };

  const handleSearchBlur = () => {
    setTimeout(() => setShowSearchSuggestions(false), 200);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);

    setShowSearchSuggestions(false);

    navigate("/studentpage/search", { state: { query: suggestion } });
  };

  const matchingFeatures = studentSearchFeatures.filter((feature) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return `${feature.label} ${feature.description}`
      .toLowerCase()
      .includes(query);
  });


  return (
    <header className={`fixed left-0 right-0 top-0 z-50 hidden h-[64px] items-center border-b border-[#E5E7EB] bg-[#F7FAFC] px-3 md:flex md:px-5 lg:left-[72px] ${panelOpen ? "lg:left-[432px] lg:pl-0" : ""}`}>
      {/* Search Bar */}

      <div className="flex min-w-0 flex-1 justify-start px-0 md:px-4 lg:mr-3 lg:px-0 lg:translate-y-[3px]">
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute left-4 top-1/2 z-10 flex items-center justify-center text-slate-600">
            <Search className="h-5 w-5" />
          </div>

          <input
            type="text"

            placeholder="Search"

            value={searchQuery}

            onChange={(e) => {
              setSearchQuery(e.target.value);

              setShowSearchSuggestions(e.target.value.length > 0);
            }}

            onKeyDown={handleSearch}

            onFocus={handleSearchFocus}

            onBlur={handleSearchBlur}

            className="h-12 w-full rounded-[50px] border-0 bg-[#E7E7E4] pl-12 pr-20 text-[16px] font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-600 focus:bg-[#E7E7E4] md:h-[54px] md:pr-24 md:text-base lg:h-[54px] lg:pr-14 lg:text-base"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-12 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-blue-100 transition-colors hover:bg-white/10 hover:text-white md:right-14 lg:right-3"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleSearchButtonClick}
            aria-label="Search books"
            className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-[#2563EB] p-1.5 transition-colors hover:bg-[#1D4ED8] md:right-3 md:p-2 lg:hidden"
          >
            <Search className="h-3.5 w-3.5 text-white md:h-4 md:w-4" />
          </button>

          {/* Global student feature suggestions */}
          {showSearchSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-[#E5E7EB] shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-2 border-b border-[#EEF2F6]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Student page
                </p>
              </div>
              <div className="p-2">
                {matchingFeatures.map((feature) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <button
                      key={feature.path}
                      onClick={() => {
                        setShowSearchSuggestions(false);
                        navigate(
                          feature.path,
                          feature.path === "/studentpage/search"
                            ? { state: { query: searchQuery.trim() } }
                            : undefined,
                        );
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F8FAFC] transition-colors text-left"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#DDE6EF] text-[#2563EB] shrink-0">
                        <FeatureIcon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-[#0F172A] truncate">
                          {feature.label}
                        </span>
                        <span className="block text-xs text-[#64748B] truncate">
                          {feature.description}
                        </span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#94A3B8] shrink-0" />
                    </button>
                  );
                })}
                <button
                  onClick={handleSearchButtonClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg border-t border-[#EEF2F6] text-left text-sm font-medium text-[#2563EB] hover:bg-[#F8FAFC]"
                >
                  <Search className="w-4 h-4" />
                  Search for “{searchQuery}” in books
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <StudentHeaderActions
        userInfo={userInfo}
        onLogout={onLogout}
        className="ml-auto shrink-0"
      />
    </header>
  );
}

export function StudentLayout({
  children,
  schoolInfo,
  userInfo,
  onLogout,
  isPreviewMode = false,
  onReturnToAdmin,
  adminRoleLabel,
}) {
  const location = useLocation();
  const isSearchRoute = location.pathname.startsWith("/studentpage/search");
  const isHomeRoute = location.pathname === "/studentpage" || location.pathname === "/studentpage/";
  const isSearchOrHome = isSearchRoute || isHomeRoute;

  // Map routes → page titles for minimalist header
  const PAGE_TITLES = {
    "/studentpage/favorites": { label: "Favorites", icon: Heart },
    "/studentpage/inbox": { label: "Inbox", icon: Mail },
    "/studentpage/history": { label: "Borrow History", icon: ClockIcon },
    "/studentpage/settings": { label: "Settings", icon: Settings },
    "/studentpage/profile": { label: "My Profile", icon: User },
    "/studentpage/help": { label: "Help", icon: Book },
    "/studentpage/about": { label: "About", icon: Book },
    "/studentpage/borrowing": { label: "Borrowing List", icon: ShoppingCart },
    "/studentpage/qr": { label: "My ID Card", icon: User },
  };
  const currentPageMeta = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || { label: "LibraLink", icon: Book };
  const [activePanel, setActivePanel] = useState(null);
  const panelMeta = {
    favorites: { title: "Favorites", icon: Heart, iconClass: "text-rose-500 bg-rose-50" },
    inbox: { title: "Notifications", icon: Bell, iconClass: "text-amber-500 bg-amber-50" },
    history: { title: "Borrow history", icon: ClockIcon, iconClass: "text-blue-600 bg-blue-50" },
    profile: { title: "Profile & ID", icon: User, iconClass: "text-indigo-600 bg-indigo-50" },
    settings: { title: "Settings", icon: Settings, iconClass: "text-sky-600 bg-sky-50" },
  };
  const panelTitles = {
    favorites: "Favorites",
    inbox: "Notifications",
    history: "Borrow history",
    profile: "Profile & ID",
    settings: "Settings",
  };

  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try {
      return localStorage.getItem("libralink_student_sidebar_expanded") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("libralink_student_sidebar_expanded", String(next));
      } catch { }
      return next;
    });
  };

  const safeSchoolInfo = schoolInfo?.data || schoolInfo || {};
  const schoolName = safeSchoolInfo?.school_name || userInfo?.school_name || "LibraLink";

  // Sidebar profile picture resolution with real-time sync & localStorage caching
  const [sidebarImageError, setSidebarImageError] = useState(false);
  const [profileSyncKey, setProfileSyncKey] = useState(0);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setSidebarImageError(false);
      setProfileSyncKey((prev) => prev + 1);
    };

    window.addEventListener("libralink-profile-updated", handleProfileUpdate);
    window.addEventListener("libralink-user-changed", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("libralink-profile-updated", handleProfileUpdate);
      window.removeEventListener("libralink-user-changed", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const rawProfileImage =
    userInfo?.profile_picture ||
    userInfo?.profile_image ||
    userInfo?.avatar ||
    currentUser?.profile_picture ||
    currentUser?.profile_image ||
    currentUser?.avatar ||
    storedUser?.profile_picture ||
    storedUser?.profile_image ||
    storedUser?.avatar ||
    "";

  const getProfileImageUrl = (picture) => {
    if (!picture) return "";
    if (
      picture.startsWith("http://") ||
      picture.startsWith("https://") ||
      picture.startsWith("data:") ||
      picture.startsWith("blob:")
    ) {
      return picture;
    }
    if (picture.startsWith("/")) return `${API_ORIGIN}${picture}`;
    return `${API_ORIGIN}/${picture}`;
  };

  const userId = userInfo?.user_id || currentUser?.user_id || currentUser?.id || storedUser?.user_id || storedUser?.id;
  const cachedAvatar = userId ? localStorage.getItem(`libralink_avatar_${userId}`) : null;

  const candidateImage = rawProfileImage || cachedAvatar || "";
  const sidebarAvatarUrl = (!sidebarImageError && candidateImage)
    ? getProfileImageUrl(candidateImage)
    : "";

  const userDisplayName = userInfo?.first_name || userInfo?.name || currentUser?.first_name || currentUser?.name || storedUser?.first_name || storedUser?.name || "Student";
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  return (
    <div
      className="student-layout min-h-[100dvh] w-full max-w-full overflow-x-visible bg-[#F7FAFC] flex"
      data-panel-open={activePanel ? "true" : "false"}
      data-active-panel={activePanel || ""}
    >
      {/* Top Student Preview Mode Banner */}
      {isPreviewMode && (
        <aside
          aria-label="Student preview mode status"
          className="fixed inset-x-0 top-0 h-[40px] z-[70] bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white px-3 sm:px-4 text-xs flex items-center justify-between border-b border-indigo-900/60 shadow-md"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-200 font-medium truncate">
              🎓 <strong className="text-white font-semibold">Student Preview Mode Active</strong>
              <span className="text-slate-400 hidden sm:inline"> — Viewing library catalog and reader experience as a Student.</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onReturnToAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer shrink-0 ml-2"
          >
            <span>Return to {adminRoleLabel || 'Admin Console'} →</span>
          </button>
        </aside>
      )}

      {/* LEFT SIDEBAR (Expandable w-[72px] to w-[240px]) */}
      <aside
        className={`fixed left-0 bottom-0 z-40 hidden flex-col border-r border-[#E5E7EB] bg-white transition-all duration-300 ease-in-out lg:flex ${
          isPreviewMode ? "top-[40px]" : "top-0"
        } ${sidebarExpanded ? "w-[240px]" : "w-[72px]"}`}
      >
        {/* Top Branding & Toggle */}
        <div className="flex h-[64px] shrink-0 items-center border-b border-slate-100 px-3.5">
          {sidebarExpanded ? (
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/L.png"
                  alt="Libralink"
                  className="h-8 w-8 shrink-0 object-contain"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 truncate leading-none">
                    LibraLink
                  </h1>
                  <p className="text-[10px] font-medium text-slate-400 truncate mt-1">
                    {schoolName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center">
              <button
                type="button"
                onClick={toggleSidebar}
                className="group relative flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <img
                  src="/L.png"
                  alt="Libralink"
                  className="h-8 w-8 object-contain group-hover:scale-105 transition-transform"
                />
              </button>
            </div>
          )}
        </div>

        {/* Expand helper button when collapsed */}
        {!sidebarExpanded && (
          <div className="flex justify-center pt-2 pb-0.5">
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Icons & Links */}
        <nav className="flex-1 flex flex-col py-4 px-2.5 gap-1.5 overflow-y-auto scrollbar-hide">
          {/* Home */}
          <NavLink
            to="/studentpage"
            end
            onClick={() => setActivePanel(null)}
            title={!sidebarExpanded ? "Home" : undefined}
            className={({ isActive }) => `
              relative flex items-center rounded-xl transition-all duration-200
              ${sidebarExpanded ? "gap-3 px-3 py-2.5 text-sm font-medium" : "justify-center p-3"}
              ${isActive && !activePanel ? "text-[#2563EB] bg-blue-50/80 font-semibold" : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50"}
            `}
          >
            {({ isActive }) => (
              <>
                <Home className="w-5 h-5 flex-shrink-0" />
                {sidebarExpanded ? (
                  <span className="truncate">Home</span>
                ) : (
                  <span className="sr-only">Home</span>
                )}
                {isActive && !activePanel && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2563EB] rounded-r-full" />
                )}
              </>
            )}
          </NavLink>

          {/* Search Books */}
          <NavLink
            to="/studentpage/search"
            onClick={() => setActivePanel(null)}
            title={!sidebarExpanded ? "Search Books" : undefined}
            className={({ isActive }) => `
              relative flex items-center rounded-xl transition-all duration-200
              ${sidebarExpanded ? "gap-3 px-3 py-2.5 text-sm font-medium" : "justify-center p-3"}
              ${isActive && !activePanel ? "text-[#2563EB] bg-blue-50/80 font-semibold" : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50"}
            `}
          >
            {({ isActive }) => (
              <>
                <Search className="w-5 h-5 flex-shrink-0" />
                {sidebarExpanded ? (
                  <span className="truncate">Search Books</span>
                ) : (
                  <span className="sr-only">Search Books</span>
                )}
                {isActive && !activePanel && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2563EB] rounded-r-full" />
                )}
              </>
            )}
          </NavLink>

          {/* Favorites (Drawer) */}
          <NavLink
            to="/studentpage/favorites"
            onClick={(event) => {
              event.preventDefault();
              setActivePanel(activePanel === "favorites" ? null : "favorites");
            }}
            title={!sidebarExpanded ? "Favorites" : undefined}
            className={({ isActive }) => `
              relative flex items-center rounded-xl transition-all duration-200
              ${sidebarExpanded ? "gap-3 px-3 py-2.5 text-sm font-medium" : "justify-center p-3"}
              ${isActive || activePanel === "favorites" ? "text-[#2563EB] bg-blue-50/80 font-semibold" : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50"}
            `}
          >
            {({ isActive }) => (
              <>
                <Heart className="w-5 h-5 flex-shrink-0" />
                {sidebarExpanded ? (
                  <span className="truncate">Favorites</span>
                ) : (
                  <span className="sr-only">Favorites</span>
                )}
                {(isActive || activePanel === "favorites") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2563EB] rounded-r-full" />
                )}
              </>
            )}
          </NavLink>

          {/* Inbox / Notifications (Drawer) */}
          <NavLink
            to="/studentpage/inbox"
            onClick={(event) => {
              event.preventDefault();
              setActivePanel(activePanel === "inbox" ? null : "inbox");
            }}
            title={!sidebarExpanded ? "Inbox" : undefined}
            className={({ isActive }) => `
              relative flex items-center rounded-xl transition-all duration-200
              ${sidebarExpanded ? "gap-3 px-3 py-2.5 text-sm font-medium" : "justify-center p-3"}
              ${isActive || activePanel === "inbox" ? "text-[#2563EB] bg-blue-50/80 font-semibold" : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50"}
            `}
          >
            {({ isActive }) => (
              <>
                <Mail className="w-5 h-5 flex-shrink-0" />
                {sidebarExpanded ? (
                  <span className="truncate">Inbox</span>
                ) : (
                  <span className="sr-only">Inbox</span>
                )}
                {(isActive || activePanel === "inbox") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2563EB] rounded-r-full" />
                )}
              </>
            )}
          </NavLink>

          {/* Borrow History (Drawer) */}
          <NavLink
            to="/studentpage/history"
            onClick={(event) => {
              event.preventDefault();
              setActivePanel(activePanel === "history" ? null : "history");
            }}
            title={!sidebarExpanded ? "Borrowing History" : undefined}
            className={({ isActive }) => `
              relative flex items-center rounded-xl transition-all duration-200
              ${sidebarExpanded ? "gap-3 px-3 py-2.5 text-sm font-medium" : "justify-center p-3"}
              ${isActive || activePanel === "history" ? "text-[#2563EB] bg-blue-50/80 font-semibold" : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50"}
            `}
          >
            {({ isActive }) => (
              <>
                <ClockIcon className="w-5 h-5 flex-shrink-0" />
                {sidebarExpanded ? (
                  <span className="truncate">Borrow History</span>
                ) : (
                  <span className="sr-only">Borrowing History</span>
                )}
                {(isActive || activePanel === "history") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2563EB] rounded-r-full" />
                )}
              </>
            )}
          </NavLink>
        </nav>

        {/* Bottom Icons & Profile */}
        <div className="shrink-0 border-t border-slate-100 p-2.5">
          {/* Settings */}
          <NavLink
            to="/studentpage/settings"
            onClick={(event) => {
              event.preventDefault();
              setActivePanel(activePanel === "settings" ? null : "settings");
            }}
            title={!sidebarExpanded ? "Settings" : undefined}
            className={({ isActive }) => `
              relative flex items-center rounded-xl transition-all duration-200
              ${sidebarExpanded ? "gap-3 px-3 py-2 text-sm font-medium" : "justify-center p-3"}
              ${isActive || activePanel === "settings" ? "text-[#2563EB] bg-blue-50/80 font-semibold" : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50"}
            `}
          >
            {({ isActive }) => (
              <>
                <Settings className="w-5 h-5 flex-shrink-0" />
                {sidebarExpanded ? (
                  <span className="truncate">Settings</span>
                ) : (
                  <span className="sr-only">Settings</span>
                )}
                {(isActive || activePanel === "settings") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2563EB] rounded-r-full" />
                )}
              </>
            )}
          </NavLink>

          {/* Profile Card */}
          {sidebarExpanded ? (
            <div className="mt-2 pt-2 border-t border-slate-100/80">
              <button
                type="button"
                onClick={() => setActivePanel(activePanel === "profile" ? null : "profile")}
                className="flex w-full items-center gap-3 p-2 rounded-xl hover:bg-slate-50 text-left transition-all duration-200 group"
                title="View Profile"
              >
                {sidebarAvatarUrl ? (
                  <div className="relative h-9 w-9 shrink-0">
                    <img
                      key={`sidebar-avatar-${profileSyncKey}`}
                      src={sidebarAvatarUrl}
                      alt={userDisplayName}
                      className="h-9 w-9 rounded-full object-cover border-2 border-blue-500/20 shadow-xs group-hover:border-blue-500 transition-colors"
                      onError={() => setSidebarImageError(true)}
                    />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                ) : (
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-xs group-hover:ring-2 group-hover:ring-blue-400/40 transition-all">
                    {userInitial}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                    {userDisplayName}
                  </p>
                  <p className="truncate text-[10px] text-slate-400 mt-0.5">
                    {userInfo?.student_id || userInfo?.id_number || currentUser?.student_id || currentUser?.id_number || "Student Account"}
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="mt-2 pt-2 border-t border-slate-100/80 flex justify-center">
              <button
                type="button"
                onClick={() => setActivePanel(activePanel === "profile" ? null : "profile")}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-50 transition-colors"
                title={userDisplayName}
              >
                {sidebarAvatarUrl ? (
                  <div className="relative h-9 w-9 shrink-0">
                    <img
                      key={`sidebar-avatar-mini-${profileSyncKey}`}
                      src={sidebarAvatarUrl}
                      alt={userDisplayName}
                      className="h-9 w-9 rounded-full object-cover border-2 border-blue-500/20 shadow-xs hover:border-blue-500 transition-colors"
                      onError={() => setSidebarImageError(true)}
                    />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                ) : (
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-xs">
                    {userInitial}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
      </aside>

      {activePanel && (
        <section
          aria-label={`${activePanel} panel`}
          className={`student-expanded-panel fixed inset-x-0 bottom-0 z-40 flex flex-col w-full min-w-0 border-r border-slate-300 bg-[#F7FAFC] overflow-hidden transition-all duration-300 ${
            isPreviewMode
              ? "top-[40px] md:top-[96px] lg:top-[40px] lg:h-[calc(100dvh-40px)]"
              : "top-0 md:top-[56px] lg:top-0 lg:h-dvh"
          } md:w-[380px] lg:w-[380px] ${
            sidebarExpanded ? "lg:left-[240px]" : "lg:left-[72px]"
          }`}
        >
          {/* Fixed Drawer Header - Never Scrolls */}
          <div className="flex h-[64px] shrink-0 items-center justify-between border-b border-slate-200/90 px-4 bg-white/95 backdrop-blur-md z-20">
            <div className="flex items-center gap-2.5">
              {(() => {
                const meta = panelMeta[activePanel] || {
                  title: "Panel",
                  icon: Book,
                  iconClass: "text-blue-600 bg-blue-50",
                };
                const IconComponent = meta.icon;
                return (
                  <>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.iconClass}`}>
                      <IconComponent className="h-4 w-4" />
                    </span>
                    <h2 className="text-base font-bold tracking-tight text-slate-950">{meta.title}</h2>
                  </>
                );
              })()}
            </div>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/80 hover:text-slate-900 transition-colors"
              aria-label="Close expanded panel"
              title="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pt-2 pb-16 scrollbar-hide">
            {activePanel === "favorites" && (
              <StudentFavorite isDrawer onClose={() => setActivePanel(null)} />
            )}
            {activePanel === "inbox" && (
              <StudentInbox isDrawer onClose={() => setActivePanel(null)} />
            )}
            {activePanel === "history" && (
              <StudentHistory isDrawer onClose={() => setActivePanel(null)} />
            )}
            {activePanel === "profile" && (
              <StudentProfile
                isDrawer
                onClose={() => setActivePanel(null)}
                onSwitchTab={(tab) => setActivePanel(tab)}
              />
            )}
            {activePanel === "settings" && (
              <StudentSettings
                onLogout={onLogout}
                isDrawer
                onClose={() => setActivePanel(null)}
                onSwitchTab={(tab) => setActivePanel(tab)}
              />
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TOP HEADER — two variants depending on route                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <header
        className={`fixed inset-x-0 z-[50] flex items-center border-b border-[#E5E7EB]/80 bg-white/95 backdrop-blur-md transition-all duration-300 ${
          isPreviewMode ? "top-[40px]" : "top-0"
        } ${sidebarExpanded ? "lg:left-[240px]" : "lg:left-[72px]"} ${
          activePanel ? (sidebarExpanded ? "lg:left-[620px]" : "lg:left-[452px]") : ""
        }`}
        style={{ height: 56 }}
        aria-label="Student account toolbar"
      >
        {isSearchOrHome ? (
          /* ─── SEARCH / HOME: Full search bar ─────────────────────────── */
          <div className="flex w-full min-w-0 items-center gap-2 px-3 md:gap-3 md:px-5">
            {/* Logo mark on mobile only */}
            <img src="/L.png" alt="LibraLink" className="h-7 w-7 shrink-0 object-contain md:hidden" />

            {/* Search bar — full flex */}
            <div className="min-w-0 flex-1">
              <StudentHeaderSearch />
            </div>

            {/* Mobile action buttons: Notifications */}
            <div className="flex items-center gap-0.5 shrink-0 md:hidden">
              <MobileBellButton />
            </div>

            {/* Right actions — md+ only */}
            <div className="hidden md:flex h-full shrink-0 items-center">
              <StudentHeaderActions userInfo={userInfo} onLogout={onLogout} />
            </div>
          </div>
        ) : (
          /* ─── OTHER TABS: Minimalist header (Instagram / Twitter style) ── */
          <div className="flex w-full items-center justify-between px-3 md:px-5">
            {/* Left — Logo */}
            <div className="flex items-center gap-2 min-w-[36px]">
              <img src="/L.png" alt="LibraLink" className="h-7 w-7 object-contain" />
            </div>

            {/* Center — Page title */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
              <h1 className="text-[15px] font-bold tracking-tight text-slate-900 truncate max-w-[160px] sm:max-w-none text-center">
                {currentPageMeta.label}
              </h1>
            </div>

            {/* Right — Bell + Avatar (md+) */}
            <div className="flex items-center gap-0.5 md:gap-1 shrink-0 justify-end">
              <div className="hidden md:flex items-center">
                <StudentHeaderActions userInfo={userInfo} onLogout={onLogout} />
              </div>
              {/* Mobile actions: Bell */}
              <div className="flex items-center gap-0.5 md:hidden">
                <MobileBellButton />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <div
        className={`flex-1 min-w-0 transition-all duration-300 ${sidebarExpanded ? "lg:ml-[240px]" : "lg:ml-[72px]"
          }`}
      >
        <main
          className={`w-full min-w-0 overflow-x-visible bg-[#F7FAFC] ${
            isPreviewMode ? "pt-[96px]" : "pt-[56px]"
          } ${activePanel ? "lg:pl-[380px]" : ""}`}
        >
          <div
            className={`box-border mx-auto min-w-0 w-full bg-[#F7FAFC] px-3 pb-28 sm:pb-24 sm:px-4 md:px-6 md:pb-6 lg:px-6 lg:pb-8 ${isSearchRoute ? "max-w-none" : "max-w-[1280px]"
              }`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}

      <StudentFloatingCart />
      <StudentBottomNav />
    </div>
  );
}

export function WelcomeSection({ displayName, schoolInfo, profileImage, onBrowse }) {
  const safeSchoolInfo = schoolInfo?.data || schoolInfo || {};
  const schoolName = safeSchoolInfo?.school_name || "School Library";
  const schoolCode = safeSchoolInfo?.school_code || "";
  const schoolLogo = safeSchoolInfo?.logo;

  const getLogoUrl = (logo) => {
    if (!logo) return "";
    const apiOrigin = API_ORIGIN;
    if (
      logo.startsWith("http://") ||
      logo.startsWith("https://") ||
      logo.startsWith("data:") ||
      logo.startsWith("blob:")
    ) {
      return logo;
    }
    if (logo.startsWith("/")) return `${apiOrigin}${logo}`;
    return `${apiOrigin}/${logo}`;
  };

  const logoSrc = getLogoUrl(schoolLogo) || "/L.png";

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl shadow-slate-900/10">
      {/* Decorative gradient glow effects */}
      <div className="pointer-events-none absolute -right-16 -top-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-indigo-500/20 blur-2xl" />

      <div className="relative z-10 grid grid-cols-1 items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_320px]">
        {/* Left Side: Welcome Details */}
        <div className="flex flex-col justify-center">
          {/* School Badge Pill */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-md self-start mb-5 shadow-sm">
            <img
              src={logoSrc}
              alt={`${schoolName} logo`}
              className="h-5 w-5 rounded-full object-contain bg-white/90 p-0.5"
              onError={(e) => {
                e.target.src = "/L.png";
              }}
            />
            <span className="text-xs font-medium tracking-wide text-slate-200">
              {schoolName} {schoolCode && <span className="text-slate-400">({schoolCode})</span>}
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl lg:text-[2.5rem] leading-tight">
            Welcome back, {displayName}
          </h1>

          <p className="mt-2.5 max-w-lg text-sm text-slate-300 sm:text-base font-normal leading-relaxed">
            Explore thousands of books, track your active loans in real-time, and reserve titles effortlessly from your campus library.
          </p>

          {/* Action Button & Quick status */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onBrowse}
              className="group inline-flex items-center gap-2.5 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-md transition-all duration-200 hover:bg-slate-100 active:scale-[0.98]"
            >
              Browse Library Catalog
              <ChevronRight className="h-4 w-4 text-slate-700 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* Right Side: Photo/Illustration */}
        <div className="hidden lg:flex justify-end items-center pr-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-slate-900/60 via-transparent to-transparent z-10 pointer-events-none" />
            <img
              src="/student.png"
              alt="Students studying"
              className="max-h-[220px] w-auto object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-[1.02]"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const accentStyles = {
  blue: {
    bg: "bg-[#F8FAFC]",

    icon: "bg-[#2563EB] text-white",

    text: "text-[#0F172A]",

    subtitle: "text-[#64748B]",

    border: "border-[#E5E7EB]",
  },

  green: {
    bg: "bg-[#F0FDF4]",

    icon: "bg-[#16A34A] text-white",

    text: "text-[#0F172A]",

    subtitle: "text-[#64748B]",

    border: "border-[#BBF7D0]",
  },

  orange: {
    bg: "bg-[#FFF7ED]",

    icon: "bg-[#F97316] text-white",

    text: "text-[#0F172A]",

    subtitle: "text-[#64748B]",

    border: "border-[#FED7AA]",
  },

  red: {
    bg: "bg-[#FEF2F2]",

    icon: "bg-[#DC2626] text-white",

    text: "text-[#0F172A]",

    subtitle: "text-[#64748B]",

    border: "border-[#FECACA]",
  },
};

export function StatsCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color = "blue",
  onClick,
}) {
  const style = accentStyles[color] || accentStyles.blue;

  return (
    <div
      onClick={onClick}

      className={`${style.bg} ${style.border} border rounded-2xl p-5 transition-all duration-200 hover:shadow-md cursor-pointer`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 ${style.icon} rounded-xl`}>
          <Icon className="w-6 h-6" />
        </div>

        <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#64748B]">
          {title}
        </span>
      </div>

      <div>
        <p className={`text-4xl font-bold ${style.text}`}>{value}</p>

        <p className={`mt-1 text-sm ${style.subtitle}`}>{subtitle}</p>
      </div>
    </div>
  );
}

export function BorrowedBooks({ books, onRenew, onViewAll }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-[#0F172A]">
            Currently Borrowed
          </h3>

          <p className="text-sm text-[#64748B]">Books checked out by you</p>
        </div>

        <button onClick={onViewAll} className="min-h-11 px-2 text-sm font-semibold text-[#2563EB] transition-colors active:text-[#1D4ED8]">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {books.length > 0 ? (
          books.map((book) => (
            <BorrowedBookCard key={book.id} book={book} onRenew={onRenew} />
          ))
        ) : (
          <div className="text-center py-12 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
            <Book className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />

            <p className="text-sm font-medium text-[#64748B]">
              No borrowed books
            </p>

            <p className="text-xs text-[#94A3B8] mt-1">
              Start exploring the library!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BorrowedBookCard({ book, onRenew }) {
  const statusStyles = {
    overdue: "bg-red-100 text-red-700 border-red-200",

    dueSoon: "bg-orange-100 text-orange-700 border-orange-200",

    onTime: "bg-green-100 text-green-700 border-green-200",
  };

  const statusLabels = {
    overdue: "Overdue",

    dueSoon: "Due Soon",

    onTime: "On Time",
  };

  return (
    <div className="flex items-center gap-4 p-5 rounded-2xl border border-[#E5E7EB] bg-white hover:border-[#2563EB] transition-all duration-200 shadow-sm hover:shadow-md">
      {/* Book Cover Thumbnail */}

      <div className="w-20 h-24 flex-shrink-0 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl flex items-center justify-center">
        <Book className="w-10 h-10 text-[#64748B]" />
      </div>

      {/* Book Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <p className="text-base font-semibold text-[#0F172A] line-clamp-1">
            {book.title}
          </p>
          {book.ownerSchool && (
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              {book.ownerSchool}
            </span>
          )}
        </div>

        <p className="text-sm text-[#64748B] mb-2">{book.author}</p>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusStyles[book.status] || statusStyles.onTime}`}
          >
            {statusLabels[book.status] || "On Time"}
          </span>

          <span className="text-xs font-medium text-[#64748B]">· {book.dueIn}</span>
        </div>
      </div>

      {/* Actions */}

      <div className="flex items-center gap-3">
        {book.status !== "overdue" && onRenew && (
          <button
            onClick={() => onRenew(book.borrowId)}

            className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors"
          >
            Renew
          </button>
        )}

        <ChevronRight className="w-6 h-6 text-[#64748B] flex-shrink-0" />
      </div>
    </div>
  );
}

export function CalendarWidget({ borrowedBooks = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();

    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);

    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();

    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",

    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getBookDueDates = () => {
    const dueDates = {};

    borrowedBooks.forEach((book) => {
      if (book.dueDate) {
        const dueDate = new Date(book.dueDate);

        const dateKey = dueDate.toISOString().split("T")[0];

        dueDates[dateKey] = {
          status: book.status,

          count: (dueDates[dateKey]?.count || 0) + 1,
        };
      }
    });

    return dueDates;
  };

  const bookDueDates = getBookDueDates();

  const today = new Date();

  const todayKey = today.toISOString().split("T")[0];

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDateStatus = (day) => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );

    const dateKey = date.toISOString().split("T")[0];

    if (dateKey === todayKey) return "today";

    if (bookDueDates[dateKey]) return bookDueDates[dateKey].status;

    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#64748B]">
            Calendar
          </p>

          <h3 className="mt-1 text-xl font-bold text-[#0F172A]">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}

            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180 text-[#64748B]" />
          </button>

          <button
            onClick={handleToday}

            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#0077B6] to-[#005f8f] hover:from-[#006699] hover:to-[#004d73] rounded-xl transition-all duration-300 shadow-md"
          >
            Today
          </button>

          <button
            onClick={handleNextMonth}

            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-[#64748B] mb-3">
        {days.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 text-sm text-[#0F172A]">
        {/* Empty cells for days before the first day of the month */}

        {Array.from({ length: startingDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="h-10" />
        ))}

        {/* Days of the month */}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;

          const status = getDateStatus(day);

          const date = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            day,
          );

          const dateKey = date.toISOString().split("T")[0];

          const bookInfo = bookDueDates[dateKey];

          return (
            <div
              key={day}

              className={`



                relative flex h-10 items-center justify-center rounded-xl transition-all duration-300 cursor-pointer



                ${status === "today" ? "bg-gradient-to-r from-[#0077B6] to-[#005f8f] text-white font-bold shadow-lg scale-105" : ""}



                ${status === "overdue" ? "bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold" : ""}



                ${status === "dueSoon" ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold" : ""}



                ${status === "onTime" ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold" : ""}



                ${!status && "hover:bg-gray-100 hover:scale-105"}



              `}
            >
              {day}

              {bookInfo && bookInfo.count > 1 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-[#0077B6] to-[#005f8f] text-white text-[10px] rounded-full flex items-center justify-center shadow-md">
                  {bookInfo.count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}

      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-lg bg-gradient-to-r from-red-500 to-rose-600"></div>

          <span className="text-xs font-medium text-gray-600">Overdue</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600"></div>

          <span className="text-xs font-medium text-gray-600">Due Soon</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600"></div>

          <span className="text-xs font-medium text-gray-600">Due Date</span>
        </div>
      </div>
    </div>
  );
}

export function AnnouncementsWidget({ announcements }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#64748B]">
            Announcements
          </p>

          <h3 className="mt-1 text-xl font-bold text-[#0F172A]">
            Library updates
          </h3>
        </div>

        <button className="text-sm font-medium text-[#0077B6] hover:text-[#005f8f] transition-colors">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="p-5 rounded-2xl border border-[#E2E8F0] bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-white hover:border-[#0077B6] transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <h4 className="text-sm font-bold text-[#0F172A] mb-2">
                {announcement.title}
              </h4>

              <p className="text-sm text-[#64748B] leading-relaxed mb-3">
                {announcement.message}
              </p>

              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0077B6]">
                {announcement.date}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />

            <p className="text-sm font-medium text-gray-500">
              No announcements
            </p>

            <p className="text-xs text-gray-400 mt-1">
              Check back later for updates!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
