import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor: string;
  required?: boolean;
}

export function Label({
  htmlFor,
  required = false,
  className = '',
  children,
  ...props
}: LabelProps) {
  const baseClasses = 'block text-sm font-medium text-textPrimary mb-1';
  const combinedClassName = `${baseClasses} ${className}`.trim();

  return (
    <label htmlFor={htmlFor} className={combinedClassName} {...props}>
      {children}
      {required && (
        <span aria-hidden="true" className="ml-1">
          *
        </span>
      )}
    </label>
  );
}
