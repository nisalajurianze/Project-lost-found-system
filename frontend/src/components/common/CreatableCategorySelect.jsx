import React from 'react';
import CreatableSelect from 'react-select/creatable';

export const CreatableCategorySelect = React.forwardRef(({
  label,
  name,
  options = [],
  value,
  onChange,
  error = '',
  helperText = '',
  required = false,
  className = '',
  placeholder = 'Select or type a category...',
  ...props
}, ref) => {

  const customStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      boxShadow: 'none',
      minHeight: '42px',
      '&:hover': {
        borderColor: 'transparent',
      }
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--tw-prose-body)', // will be overridden by classes
      borderRadius: '0.5rem',
      overflow: 'hidden',
      zIndex: 50
    }),
    menuList: (base) => ({
      ...base,
      padding: 0
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? 'rgba(99, 102, 241, 0.1)' : 'transparent', // primary-500/10
      color: state.isFocused ? '#6366f1' : 'inherit', // primary-500
      cursor: 'pointer',
      padding: '10px 14px'
    }),
    singleValue: (base) => ({
      ...base,
      color: 'inherit',
    }),
    input: (base) => ({
      ...base,
      color: 'inherit',
      margin: 0,
      padding: 0
    }),
    placeholder: (base) => ({
      ...base,
      color: '#64748b' // text-surface-500
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 14px'
    })
  };

  // Find the selected option object
  const selectedOption = options.find(opt => opt.value === value) || (value ? { label: value, value: value } : null);

  const handleChange = (selected) => {
    // Return an event-like object to be compatible with existing onChange handlers
    onChange({ target: { name, value: selected ? selected.value : '' } });
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="input-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className={`input-base p-0 focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 ${error ? 'input-error' : ''}`}>
        <CreatableSelect
          ref={ref}
          inputId={name}
          name={name}
          options={options}
          value={selectedOption}
          onChange={handleChange}
          placeholder={placeholder}
          isClearable
          formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
          styles={customStyles}
          classNamePrefix="react-select"
          required={required && !value}
          // use react-select's classNames for tailwind integration
          classNames={{
            menu: () => 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-xl',
            option: () => 'text-surface-700 dark:text-surface-300',
            singleValue: () => 'text-surface-900 dark:text-white',
            input: () => 'text-surface-900 dark:text-white'
          }}
          {...props}
        />
      </div>

      {error && <p className="input-error-text mt-1 text-sm text-red-500">{error}</p>}
      {!error && helperText && <p className="input-helper mt-1 text-xs text-surface-500">{helperText}</p>}
    </div>
  );
});

CreatableCategorySelect.displayName = 'CreatableCategorySelect';
export default CreatableCategorySelect;
