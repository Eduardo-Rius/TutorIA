import React from 'react';

export type ContainerElement = 'div' | 'section' | 'main' | 'article';

export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  as?: ContainerElement;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
} as const;

export function Container({
  as: Component = 'div',
  maxWidth = 'lg',
  padding = true,
  className = '',
  children,
  ...props
}: ContainerProps) {
  const baseClasses = 'mx-auto w-full';
  const paddingClass = padding ? 'px-4 sm:px-6' : '';
  const maxWClass = maxWidthClasses[maxWidth];

  const combinedClassName = `${baseClasses} ${paddingClass} ${maxWClass} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <Component {...props} className={combinedClassName}>
      {children}
    </Component>
  );
}
