import React from 'react';

const IconButton = ({ 
  icon, 
  onClick, 
  variant = 'ghost',
  size = 'md',
  disabled = false,
  className = '',
  ...props 
}) => {
  const baseClasses = 'flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-50',
    danger: 'text-red-600 hover:bg-red-50',
  };
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };
  
  const roundedClasses = 'rounded-lg';
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${roundedClasses} ${className}`;
  
  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {icon}
    </button>
  );
};

export default IconButton;
