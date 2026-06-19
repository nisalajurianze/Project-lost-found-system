// ============================================
// Select Form Component
// Label, option arrays, and styling states
// ============================================

import React from 'react';

export const Select = React.forwardRef(({
  label,
  name,
  options = [],
  error = '',
  helperText = '',
  required = false,
  className = '',
  placeholder = 'Select an option',
  ...props
}, ref) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="input-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={name}
        name={name}
        className={`input-base appearance-none ${error ? 'input-error' : ''}`}
        required={required}
        {...props}
      >
        {placeholder && (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="input-error-text">{error}</p>}
      {!error && helperText && <p className="input-helper">{helperText}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;

