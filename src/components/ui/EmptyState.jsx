import React from 'react';
import Button from './Button';

const EmptyState = ({ 
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      {icon && (
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
          <div className="text-blue-600">
            {icon}
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-slate-500 text-sm max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button variant={action.variant || 'primary'} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
