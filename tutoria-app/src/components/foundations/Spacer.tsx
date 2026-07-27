import React from 'react';
import type { Spacing } from '../../theme';

export interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: keyof Spacing;
  horizontal?: boolean;
}

const widthClasses: Record<keyof Spacing, string> = {
  0: 'w-0', 1: 'w-1', 2: 'w-2', 3: 'w-3', 4: 'w-4', 5: 'w-5', 6: 'w-6', 8: 'w-8', 10: 'w-10', 12: 'w-12', 16: 'w-16', 20: 'w-20', 24: 'w-24'
};

const heightClasses: Record<keyof Spacing, string> = {
  0: 'h-0', 1: 'h-1', 2: 'h-2', 3: 'h-3', 4: 'h-4', 5: 'h-5', 6: 'h-6', 8: 'h-8', 10: 'h-10', 12: 'h-12', 16: 'h-16', 20: 'h-20', 24: 'h-24'
};

export function Spacer({
  size = 4,
  horizontal = false,
  className = '',
  ...props
}: SpacerProps) {
  const dimensionClass = horizontal ? `${widthClasses[size]} h-px` : `${heightClasses[size]} w-full`;
  const combinedClassName = `flex-none ${dimensionClass} ${className}`.trim().replace(/\s+/g, ' ');

  return <div {...props} className={combinedClassName} aria-hidden="true" />;
}
