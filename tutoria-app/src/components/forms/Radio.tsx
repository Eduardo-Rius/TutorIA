import React from 'react';

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ invalid = false, className = '', disabled, ...props }, ref) => {
    const baseClasses = 'h-4 w-4 rounded-circle border border-brandPrimary/10 bg-surfacePrimary text-brandPrimary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandSecondary disabled:opacity-50 disabled:cursor-not-allowed';

    const combinedClassName = `${baseClasses} ${className}`.trim();

    return (
      <input
        type="radio"
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid}
        aria-disabled={disabled}
        className={combinedClassName}
        {...props}
      />
    );
  }
);
Radio.displayName = 'Radio';
