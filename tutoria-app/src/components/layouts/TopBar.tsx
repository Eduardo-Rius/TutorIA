import React from 'react';
import { Surface, Inline } from '../foundations';

export interface TopBarProps extends React.HTMLAttributes<HTMLElement> {
  leadingSlot?: React.ReactNode;
  centerSlot?: React.ReactNode;
  trailingSlot?: React.ReactNode;
}

export function TopBar({
  leadingSlot,
  centerSlot,
  trailingSlot,
  className = '',
  ...props
}: TopBarProps) {
  const combinedClassName = `w-full h-16 border-b border-brandPrimary/10 px-4 sm:px-6 lg:px-8 ${className}`.trim();

  return (
    <Surface as="header" className={combinedClassName} {...props}>
      <div className="flex items-center justify-between h-full">
        <div className="flex-1 flex items-center justify-start">
          {leadingSlot}
        </div>

        {centerSlot && (
          <div className="flex-1 flex items-center justify-center px-4">
            {centerSlot}
          </div>
        )}

        <div className="flex-1 flex items-center justify-end">
          {trailingSlot}
        </div>
      </div>
    </Surface>
  );
}
