import React from 'react';

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement | HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export function Divider({
  orientation = 'horizontal',
  className = '',
  ...props
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div 
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
        role="separator" 
        aria-orientation="vertical"
        className={`w-px h-full bg-brandPrimary/10 ${className}`.trim().replace(/\s+/g, ' ')} 
      />
    );
  }

  return (
    <hr 
      {...(props as React.HTMLAttributes<HTMLHRElement>)}
      className={`w-full border-t border-brandPrimary/10 m-0 ${className}`.trim().replace(/\s+/g, ' ')} 
    />
  );
}
