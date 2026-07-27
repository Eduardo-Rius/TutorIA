import React from 'react';
import { Inline } from '../../foundations';
import { Text } from '../../primitives';
import { AIComponentProps } from '../shared/types';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface ConfidenceBadgeProps extends React.HTMLAttributes<HTMLDivElement>, AIComponentProps {
  level: ConfidenceLevel;
  label?: string;
  iconSlot?: React.ReactNode;
}

export function ConfidenceBadge({
  level,
  label = 'Confianza',
  iconSlot,
  loading = false,
  disabled = false,
  className = '',
  ...props
}: ConfidenceBadgeProps) {
  // ARB DIRECTIVE: Semantic colors deferred. Representing solely via composition.
  const combinedClassName = `inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-textPrimary/10 bg-surfacePrimary ${className}`.trim();

  let levelText = '';
  switch (level) {
    case 'low': levelText = 'Baja'; break;
    case 'medium': levelText = 'Media'; break;
    case 'high': levelText = 'Alta'; break;
  }

  return (
    <div className={combinedClassName} {...props}>
      {iconSlot && <span className="text-textPrimary/60">{iconSlot}</span>}
      <Text size="xs" weight={500} className="text-textPrimary/70">
        {label}:
      </Text>
      <Text size="xs" weight={700} className="text-brandPrimary">
        {levelText}
      </Text>
    </div>
  );
}
