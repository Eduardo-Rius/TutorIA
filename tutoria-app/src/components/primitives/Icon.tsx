import React from 'react';

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  svg?: React.ReactNode;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Icon({
  svg,
  label,
  size = 'md',
  className = '',
  ...props
}: IconProps) {
  let sizeClass = 'w-5 h-5';
  if (size === 'sm') sizeClass = 'w-4 h-4';
  if (size === 'lg') sizeClass = 'w-6 h-6';

  const isDecorative = !label;

  return (
    <span 
      {...props}
      aria-hidden={isDecorative ? "true" : undefined}
      aria-label={label}
      role={isDecorative ? undefined : 'img'}
      className={`inline-flex items-center justify-center ${sizeClass} ${className}`.trim()}
    >
      {svg}
    </span>
  );
}
