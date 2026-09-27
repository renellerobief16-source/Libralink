import { useState, useEffect } from 'react';
import { FiLogOut, FiX, FiShield, FiCheckCircle } from 'react-icons/fi';
import { getBackendAssetUrl } from '../../utils/api';

function LogoutConfirmationModal({
  show = false,
  onConfirm,
  onCancel,
  darkMode = false,
  userInfo = null,
  schoolInfo = null
}) {
  const [isVisible, setIsVisible] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Resolve user info from props or fallback to localStorage
  const resolvedUser = userInfo || (() => {
    try {
      const stored = localStorage.getItem('currentUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const rawName = resolvedUser?.first_name || resolvedUser?.firstname || resolvedUser?.name || 'User';
  const lastName = resolvedUser?.last_name || resolvedUser?.lastname || '';
  const fullName = [rawName, lastName].filter(Boolean).join(' ') || 'Account User';
  const roleDisplay = (resolvedUser?.role_name || resolvedUser?.role || localStorage.getItem('userRole') || 'User')
    .replace(/_/g, ' ')
    .toUpperCase();

  const userAvatar = resolvedUser?.profile_picture || resolvedUser?.profile_image || '';
  const schoolCode = schoolInfo?.school_code || resolvedUser?.school_code || localStorage.getItem('schoolCode') || '';
  const schoolName = schoolInfo?.school_name || resolvedUser?.school_name || '';

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  useEffect(() => {
    let timer;
    if (show) {
      setIsVisible(true);
      setIsSigningOut(false);
      setAvatarError(false);
      setTimeout(() => setIsAnimating(true), 15);
    } else {
      setIsAnimating(false);
      timer = setTimeout(() => setIsVisible(false), 200);
    }
    return () => clearTimeout(timer);
  }, [show]);

  useEffect(() => {
    if (!show || isSigningOut) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, isSigningOut, onCancel]);

  const handleConfirmClick = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    // Smooth, perceptible security transition
    await new Promise(resolve => setTimeout(resolve, 600));
    try {
      if (onConfirm) {
        await onConfirm();
      }
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-150 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={!isSigningOut ? onCancel : undefined}
      />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-sm sm:max-w-md rounded-2xl border p-5 sm:p-6 shadow-xl transition-all duration-150 ease-out transform ${
          darkMode 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-white border-slate-200 text-slate-900'
        } ${
          isAnimating ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-98 opacity-0'
        }`}
      >
        {/* Close Button */}
        {!isSigningOut && (
          <button
            onClick={onCancel}
            className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors cursor-pointer ${
              darkMode 
                ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            aria-label="Close"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}

        {/* Minimal Icon */}
        <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${
          darkMode 
            ? 'bg-red-500/10 text-red-400' 
            : 'bg-red-50 text-red-600'
        }`}>
          <FiLogOut className="w-5 h-5" />
        </div>

        {/* Heading & Subtitle */}
        <h3 className={`text-base sm:text-lg font-semibold tracking-tight mb-1.5 ${
          darkMode ? 'text-white' : 'text-slate-900'
        }`}>
          Sign out of Libralink?
        </h3>
        <p className={`text-xs sm:text-sm leading-relaxed mb-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Are you sure you want to end your current session? You can sign back in anytime.
        </p>

        {/* Clean User Row */}
        <div className={`rounded-xl p-3 mb-6 flex items-center gap-3 border ${
          darkMode 
            ? 'bg-slate-800/40 border-slate-700/60' 
            : 'bg-slate-50/80 border-slate-200/80'
        }`}>
          <div className={`w-10 h-10 rounded-full font-medium text-xs flex items-center justify-center overflow-hidden shrink-0 border ${
            darkMode 
              ? 'bg-slate-800 text-slate-200 border-slate-700' 
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            {userAvatar && !avatarError ? (
              <img
                src={getBackendAssetUrl(userAvatar)}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-xs sm:text-sm font-semibold truncate ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                {fullName}
              </p>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide uppercase ${
                darkMode 
                  ? 'bg-slate-700/60 text-slate-300' 
                  : 'bg-slate-200/70 text-slate-600'
              }`}>
                {roleDisplay}
              </span>
            </div>
            {(schoolCode || schoolName) && (
              <p className={`text-[11px] truncate mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {schoolCode ? `${schoolCode} • ` : ''}{schoolName}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSigningOut}
            onClick={onCancel}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer border ${
              darkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            } disabled:opacity-50`}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSigningOut}
            onClick={handleConfirmClick}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-75 shadow-2xs"
          >
            {isSigningOut ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <span>Sign Out</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutConfirmationModal;
