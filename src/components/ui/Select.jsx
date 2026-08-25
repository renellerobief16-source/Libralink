import React from 'react';

const Select = ({ 
  label, 
  helperText, 
  error, 
  options = [],
  className = '', 
  id,
  ...props 
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label 
          htmlFor={selectId}
          className="text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      
      <select
        id={selectId}
        className={`h-10 rounded-lg border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
          error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
        }`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      
      {helperText && !error && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
      
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Select;
