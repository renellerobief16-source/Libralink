import React from 'react';
import Button from './Button';

const PageHeader = ({ 
  title, 
  description, 
  actions = [],
  breadcrumbs = [],
  extraContent = null,
  className = '',
}) => {
  return (
    <div className={`mb-8 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>/</span>}
              <span className={index === breadcrumbs.length - 1 ? 'text-slate-900 font-medium' : 'hover:text-slate-700'}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      )}
      
      {/* Title and Description */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-slate-600 text-sm sm:text-base max-w-2xl">
              {description}
            </p>
          )}
        </div>
        
        {/* Extra Content (Clock, etc.) */}
        {extraContent && (
          <div className="flex items-center">
            {extraContent}
          </div>
        )}
        
        {/* Action Buttons */}
        {actions.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'primary'}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
