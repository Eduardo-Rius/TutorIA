import React from 'react';
import { Surface } from '../foundations/Surface';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({
  className = '',
  children,
  ...props
}: CardProps) {
  // REMEDIATION 06: Removed interactive, role="button", and tabIndex
  const combinedClassName = `p-4 sm:p-6 ${className}`.trim();

  return (
    <Surface
      radius="md"
      elevation="sm"
      withBorder
      {...props}
      className={combinedClassName}
    >
      {children}
    </Surface>
  );
}
