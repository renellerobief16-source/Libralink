import React from 'react';

const Input = ({ 
  label, 
  helperText, 
  error, 
  className = '', 
  id,
  ...props 
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      
      <input
        id={inputId}
        className={`h-10 rounded-lg border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
          error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
        }`}
        {...props}
      />
      
      {helperText && !error && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
      
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Input;
