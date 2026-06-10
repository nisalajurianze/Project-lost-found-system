// ============================================
// Input Form Component
// Label, wrapper, and styling states
// ============================================

import React from 'react';

export const Input = React.forwardRef(({
  label,
  name,
  type = 'text',
  error = '',
  helperText = '',
  required = false,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="input-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        id={name}
        name={name}
        className={`input-base ${error ? 'input-error' : ''}`}
        required={required}
        {...props}
      />
      {error && <p className="input-error-text">{error}</p>}
      {!error && helperText && <p className="input-helper">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;

