import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  padding = 'md',
  ...props 
}) => {
  const baseClasses = 'bg-white border border-slate-200 rounded-xl shadow-sm';
  
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  const classes = `${baseClasses} ${paddingClasses[padding]} ${className}`;
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;
