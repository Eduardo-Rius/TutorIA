import React from 'react';

export interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function FieldError({
  className = '',
  children,
  ...props
}: FieldErrorProps) {
  // ARB DIRECTIVE: No danger/error tokens allowed in WAVE 1.
  // Visual state relies purely on typography (bolding) and structural ARIA attributes implicitly handled via composition.
  const baseClasses = 'text-sm font-semibold text-textPrimary mt-1 flex items-start gap-1';
  const combinedClassName = `${baseClasses} ${className}`.trim();

  if (!children) return null;

  return (
    <p role="alert" className={combinedClassName} {...props}>
      <span aria-hidden="true">!</span> {children}
    </p>
  );
}
