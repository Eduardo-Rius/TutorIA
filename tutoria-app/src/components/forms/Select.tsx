import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ invalid = false, className = '', disabled, children, ...props }, ref) => {
    // Native select appearance
    const baseClasses = 'block w-full rounded-md border border-brandPrimary/10 bg-surfacePrimary px-3 py-2 text-base text-textPrimary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandSecondary disabled:opacity-50 disabled:cursor-not-allowed';

    const combinedClassName = `${baseClasses} ${className}`.trim();

    return (
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid}
        aria-disabled={disabled}
        className={combinedClassName}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';
