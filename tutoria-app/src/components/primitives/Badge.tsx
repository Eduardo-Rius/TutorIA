import React from 'react';

// REMEDIATION 03: Primary (Navy+White) is allowed. Secondary (Teal+White) removed.
// REMEDIATION 02: Removed gray-100 fallback. Using brandPrimary/10.
export type BadgeVariant = 'default' | 'primary';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({
  label,
  variant = 'default',
  className = '',
  ...props
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium';
  
  let variantClass = 'bg-brandPrimary/10 text-brandPrimary';
  if (variant === 'primary') {
    variantClass = 'bg-brandPrimary text-white';
  }

  const combinedClassName = `${baseClasses} ${variantClass} ${className}`.trim();

  return (
    <span {...props} className={combinedClassName}>
      {label}
    </span>
  );
}
