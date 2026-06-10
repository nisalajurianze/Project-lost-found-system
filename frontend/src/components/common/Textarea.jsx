// ============================================
// Textarea Form Component
// Label, wrapper, and styling states
// ============================================

import React from 'react';

export const Textarea = React.forwardRef(({
  label,
  name,
  rows = 4,
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
      <textarea
        ref={ref}
        id={name}
        name={name}
        rows={rows}
        className={`input-base ${error ? 'input-error' : ''}`}
        required={required}
        {...props}
      />
      {error && <p className="input-error-text">{error}</p>}
      {!error && helperText && <p className="input-helper">{helperText}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';
export default Textarea;

