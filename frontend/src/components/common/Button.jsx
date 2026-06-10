// ============================================
// Button Component
// Reusable styled button with states (loading, disabled, icons)
// ============================================

import React from 'react';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon = null,
  onClick,
  className = '',
  ...props
}) => {
  const baseClasses = 'btn';
  
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    danger: 'btn-danger',
    success: 'btn-success',
    ghost: 'btn-ghost'
  };

  const sizeClasses = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  };

  const selectedVariant = variantClasses[variant] || variantClasses.primary;
  const selectedSize = sizeClasses[size] || sizeClasses.md;

  return (
    <button
      type={type}
      className={`${baseClasses} ${selectedVariant} ${selectedSize} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};

export default Button;

