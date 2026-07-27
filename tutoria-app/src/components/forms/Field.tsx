import React from 'react';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Field({
  className = '',
  children,
  ...props
}: FieldProps) {
  // Acts as a simple compositional wrapper.
  // In a real usage, developers will wrap Label, Input, and Error inside Field.
  const baseClasses = 'flex flex-col mb-4';
  const combinedClassName = `${baseClasses} ${className}`.trim();

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
}
