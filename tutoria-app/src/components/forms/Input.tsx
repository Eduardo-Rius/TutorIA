import React from 'react';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' | 'date';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: InputType;
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ type = 'text', invalid = false, className = '', disabled, ...props }, ref) => {
    // Note: No error color token yet (ARB directive). Relies on aria-invalid.
    const baseClasses = 'block w-full rounded-md border border-brandPrimary/10 bg-surfacePrimary px-3 py-2 text-base text-textPrimary placeholder:text-textPrimary/50 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandSecondary disabled:opacity-50 disabled:cursor-not-allowed';
    
    const combinedClassName = `${baseClasses} ${className}`.trim();

    return (
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        aria-invalid={invalid}
        aria-disabled={disabled}
        className={combinedClassName}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
