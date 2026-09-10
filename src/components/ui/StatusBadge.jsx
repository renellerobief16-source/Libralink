import React from 'react';

const StatusBadge = ({ 
  status, 
  variant,
  withDot = true,
  className = '', 
}) => {
  // Auto-determine variant if not explicitly provided
  const normalizedStatus = String(status || '').toLowerCase().trim();
  let resolvedVariant = variant;
  
  if (!resolvedVariant) {
    if (['available', 'active', 'approved', 'returned', 'online', 'connected', 'success', 'on time', 'ontime'].includes(normalizedStatus)) {
      resolvedVariant = 'success';
    } else if (['pending', 'in review', 'due soon', 'duesoon', 'warning', 'waiting_pickup', 'waiting for pickup'].includes(normalizedStatus)) {
      resolvedVariant = 'warning';
    } else if (['overdue', 'rejected', 'error', 'offline', 'failed', 'cancelled'].includes(normalizedStatus)) {
      resolvedVariant = 'error';
    } else if (['info', 'processing', 'transit', 'interlibrary', 'borrowed', 'requested'].includes(normalizedStatus)) {
      resolvedVariant = 'info';
    } else {
      resolvedVariant = 'neutral';
    }
  }

  const styles = {
    success: {
      badge: 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80',
      dot: 'bg-emerald-500',
    },
    warning: {
      badge: 'bg-amber-50/90 text-amber-700 border-amber-200/80',
      dot: 'bg-amber-500',
    },
    error: {
      badge: 'bg-rose-50/90 text-rose-700 border-rose-200/80',
      dot: 'bg-rose-500',
    },
    info: {
      badge: 'bg-blue-50/90 text-blue-700 border-blue-200/80',
      dot: 'bg-blue-500',
    },
    neutral: {
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
    },
  };

  const currentStyle = styles[resolvedVariant] || styles.neutral;
  
  return (
    <span className={`inline-flex items-center gap-1.5 border text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize tracking-wide transition-colors ${currentStyle.badge} ${className}`}>
      {withDot && (
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${currentStyle.dot}`} />
      )}
      {status}
    </span>
  );
};

export default StatusBadge;
