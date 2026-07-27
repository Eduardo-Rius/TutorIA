import React from 'react';

export interface FieldGroupProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  legend?: React.ReactNode;
}

export function FieldGroup({
  legend,
  className = '',
  children,
  ...props
}: FieldGroupProps) {
  const baseClasses = 'space-y-3';
  const combinedClassName = `${baseClasses} ${className}`.trim();

  return (
    <fieldset className={combinedClassName} {...props}>
      {legend && (
        <legend className="text-base font-semibold text-textPrimary mb-2">
          {legend}
        </legend>
      )}
      {children}
    </fieldset>
  );
}
