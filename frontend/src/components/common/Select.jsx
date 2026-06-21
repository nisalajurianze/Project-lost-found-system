// ============================================
// Select Form Component
// Label, option arrays, and styling states
// Includes native select for mobile and custom tailwind dropdown for desktop
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown } from 'react-icons/fi';

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
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optValue) => {
    if (onChange) {
      // Simulate native event structure for compatibility
      onChange({ target: { name, value: optValue } });
    }
    setIsOpen(false);
  };

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={name} className="input-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Mobile Native Select (hidden on md and up) */}
      <div className="md:hidden">
        <select
          ref={ref}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
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
      </div>

      {/* Desktop Custom Select (hidden on sm and down) */}
      <div className="hidden md:block relative select-none">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`input-base flex items-center justify-between cursor-pointer ${error ? 'input-error' : ''} ${isOpen ? 'ring-2 ring-primary-500/50 border-primary-500' : ''}`}
        >
          <span className={`block truncate ${selectedOption ? "text-surface-900 dark:text-white" : "text-surface-400 dark:text-surface-500"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <FiChevronDown className={`transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-primary-500' : 'text-surface-400'}`} />
        </div>

        {isOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700/80 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {placeholder && !required && (
              <div 
                className="px-4 py-2.5 text-sm cursor-pointer text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors"
                onClick={() => handleSelect('')}
              >
                {placeholder}
              </div>
            )}
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <div 
                  key={opt.value}
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center ${
                    isSelected 
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-semibold' 
                      : 'text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700/50 hover:text-surface-900 dark:hover:text-white'
                  }`}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && <p className="input-error-text mt-1">{error}</p>}
      {!error && helperText && <p className="input-helper mt-1">{helperText}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;

