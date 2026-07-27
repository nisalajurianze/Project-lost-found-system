// ============================================
// Accessible native select component
// ============================================

import React, { useId } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { useLanguage } from '../../i18n/LanguageContext';

export const Select = React.forwardRef(({
  label,
  name,
  options = [],
  error = '',
  helperText = '',
  required = false,
  className = '',
  placeholder = 'Select an option',
  value,
  onChange,
  id,
  ...props
}, ref) => {
  const { t } = useLanguage();
  const generatedId = useId();
  const controlId = id || name || `select-${generatedId}`;
  const errorId = error ? `${controlId}-error` : undefined;
  const helperId = !error && helperText ? `${controlId}-help` : undefined;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={controlId} className="input-label">
          {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
          {required && <span className="sr-only"> ({t('common.required')})</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={controlId}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          className={`input-base appearance-none pr-11 ${error ? 'input-error' : ''}`}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId || helperId}
          {...props}
        >
          {placeholder && (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FiChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-400"
        />
      </div>

      {error && <p id={errorId} className="input-error-text mt-1" role="alert">{error}</p>}
      {!error && helperText && <p id={helperId} className="input-helper mt-1">{helperText}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
