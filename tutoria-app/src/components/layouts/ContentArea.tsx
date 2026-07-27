import React from 'react';
import { Container } from '../foundations';

export interface ContentAreaProps extends React.HTMLAttributes<HTMLElement> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function ContentArea({
  maxWidth = 'xl',
  className = '',
  children,
  ...props
}: ContentAreaProps) {
  // ContentArea standardizes the vertical padding and horizontal constraint
  const combinedClassName = `py-6 sm:py-8 lg:py-10 ${className}`.trim();

  return (
    <Container as="div" maxWidth={maxWidth} padding className={combinedClassName} {...props}>
      {children}
    </Container>
  );
}
