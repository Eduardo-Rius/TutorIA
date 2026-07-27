import React from 'react';

export type PageElement = 'main' | 'div';

export interface PageProps extends React.HTMLAttributes<HTMLElement> {
  as?: PageElement;
}

export function Page({
  as: Component = 'main',
  className = '',
  children,
  ...props
}: PageProps) {
  const combinedClassName = `min-h-screen w-full flex flex-col bg-surfacePrimary ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <Component {...props} className={combinedClassName}>
      {children}
    </Component>
  );
}
