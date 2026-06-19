// ============================================
// Input Form Component
// Label, wrapper, and styling states
// ============================================

import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

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
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="input-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          type={inputType}
          id={name}
          name={name}
          className={`input-base ${isPassword ? 'pr-10' : ''} ${error ? 'input-error' : ''}`}
          required={required}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 focus:outline-none"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex="-1"
          >
            {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error && <p className="input-error-text">{error}</p>}
      {!error && helperText && <p className="input-helper">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
