import React from 'react';

export interface FieldHintProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function FieldHint({
  className = '',
  children,
  ...props
}: FieldHintProps) {
  const baseClasses = 'text-sm text-textPrimary/70 mt-1';
  const combinedClassName = `${baseClasses} ${className}`.trim();

  return (
    <p className={combinedClassName} {...props}>
      {children}
    </p>
  );
}
