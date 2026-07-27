import React from 'react';
import { Inline } from '../../foundations';
import { Text } from '../../primitives';
import { AIComponentProps } from '../shared/types';

export interface SourceBadgeProps extends React.HTMLAttributes<HTMLDivElement>, AIComponentProps {
  name: string;
  type?: string;
  iconSlot?: React.ReactNode;
}

export function SourceBadge({
  name,
  type,
  iconSlot,
  loading = false,
  disabled = false,
  className = '',
  ...props
}: SourceBadgeProps) {
  // No links implemented, static representation
  const combinedClassName = `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brandPrimary/5 border border-brandPrimary/10 ${className}`.trim();

  return (
    <div className={combinedClassName} {...props}>
      {iconSlot && <span className="text-brandPrimary">{iconSlot}</span>}
      <Text size="xs" weight={600} className="text-textPrimary truncate max-w-[150px] sm:max-w-[200px]">
        {name}
      </Text>
      {type && (
        <Text size="xs" className="text-textPrimary/50 uppercase tracking-wider ml-1">
          {type}
        </Text>
      )}
    </div>
  );
}
