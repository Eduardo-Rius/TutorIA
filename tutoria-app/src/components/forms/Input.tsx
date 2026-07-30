import React from 'react';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' | 'date';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: InputType;
  invalid?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ type = 'text', invalid = false, className = '', disabled, leftIcon, rightIcon, ...props }, ref) => {

    const baseClasses = 'block w-full rounded-[8px] border bg-surfacePrimary py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300';

    // Si hay icono izquierdo, damos más padding izquierdo. Igual para el derecho.
    const pl = leftIcon ? 'pl-11' : 'pl-4';
    const pr = rightIcon ? 'pr-11' : 'pr-4';

    const borderClass = invalid ? 'border-danger' : 'border-borderDefault';

    const combinedClassName = `${baseClasses} ${pl} ${pr} ${borderClass} ${className}`.trim();

    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-textLight">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          aria-invalid={invalid}
          aria-disabled={disabled}
          className={combinedClassName}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center text-textLight">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
