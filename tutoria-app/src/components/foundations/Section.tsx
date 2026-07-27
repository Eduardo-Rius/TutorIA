import React from 'react';

export type SectionElement = 'section' | 'article' | 'div';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: SectionElement;
  header?: React.ReactNode;
}

export function Section({
  as: Component = 'section',
  header,
  className = '',
  children,
  ...props
}: SectionProps) {
  const combinedClassName = `w-full ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <Component {...props} className={combinedClassName}>
      {header && <div className="mb-4">{header}</div>}
      {children}
    </Component>
  );
}
