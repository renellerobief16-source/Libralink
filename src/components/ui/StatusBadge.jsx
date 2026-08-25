import React from 'react';

const StatusBadge = ({ 
  status, 
  variant = 'neutral',
  className = '',
}) => {
  const variantClasses = {
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-700',
    error: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    neutral: 'bg-slate-100 text-slate-600',
  };
  
  const classes = `${variantClasses[variant]} text-xs font-medium px-2.5 py-1 rounded-full ${className}`;
  
  return (
    <span className={classes}>
      {status}
    </span>
  );
};

export default StatusBadge;
