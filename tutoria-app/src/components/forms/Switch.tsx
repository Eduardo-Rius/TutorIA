import React from 'react';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  invalid?: boolean;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ invalid = false, className = '', disabled, checked, ...props }, ref) => {
    // Accessible SR-Only pattern for the real input
    const baseClasses = 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-pill border-2 border-transparent transition-colors duration-200 ease-in-out focus-within:outline-none focus-within:ring-2 focus-within:ring-brandSecondary focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
    const bgClass = checked ? 'bg-brandPrimary' : 'bg-brandPrimary/20';

    const knobClass = `inline-block h-5 w-5 transform rounded-circle bg-surfacePrimary shadow-sm transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`;

    return (
      <label className={`${baseClasses} ${bgClass} ${className}`.trim()}>
        <input
          type="checkbox"
          role="switch"
          ref={ref}
          checked={checked}
          disabled={disabled}
          aria-invalid={invalid}
          aria-checked={checked}
          className="sr-only"
          {...props}
        />
        <span aria-hidden="true" className={knobClass} />
      </label>
    );
  }
);
Switch.displayName = 'Switch';
