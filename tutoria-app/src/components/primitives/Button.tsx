import React from 'react';
import { Spinner } from '../internal/Spinner';

// REMEDIATION 03: Secondary variant (Teal+White) removed due to WCAG failure.
// REMEDIATION 02: Danger removed (blocked token).
export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-grid place-items-center font-medium rounded-md focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandSecondary transition-colors';
  
  // REMEDIATION 10: TEMPORARY Pending Hover Tokens
  let variantClass = '';
  switch (variant) {
    case 'primary':
      variantClass = 'bg-brandPrimary text-white hover:bg-opacity-90'; // TEMPORARY hover
      break;
    case 'outline':
      variantClass = 'border-2 border-brandPrimary text-brandPrimary hover:bg-brandPrimary/10'; // TEMPORARY hover
      break;
    case 'ghost':
      variantClass = 'bg-transparent text-brandPrimary hover:bg-brandPrimary/10'; // TEMPORARY hover, fallback since gray-100 blocked
      break;
    case 'link':
      variantClass = 'bg-transparent text-brandPrimary hover:underline p-0';
      break;
  }

  let sizeClass = '';
  if (variant !== 'link') {
    switch (size) {
      case 'sm': sizeClass = 'h-8 px-3 text-sm min-w-[44px]'; break;
      case 'md': sizeClass = 'h-10 px-4 text-base min-w-[44px]'; break;
      case 'lg': sizeClass = 'h-12 px-6 text-lg min-w-[44px]'; break;
    }
  }

  const disabledClass = (disabled || loading) ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  const combinedClassName = `${baseClasses} ${variantClass} ${sizeClass} ${disabledClass} ${className}`.trim().replace(/\s+/g, ' ');

  // REMEDIATION 05: Props order fixed
  // REMEDIATION 04: Grid layout for spinner overlap using col-start-1 row-start-1
  return (
    <button 
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      className={combinedClassName}
    >
      <span className={`col-start-1 row-start-1 inline-flex items-center justify-center ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </span>
      {loading && (
        <span className="col-start-1 row-start-1">
          <Spinner className="h-5 w-5" />
        </span>
      )}
    </button>
  );
}
