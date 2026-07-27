import React from 'react';
import { Inline } from '../../foundations';
import { Text } from '../../primitives';
import { Spinner } from '../../internal/Spinner';
import { AIComponentProps } from '../shared/types';

export interface TypingIndicatorProps extends React.HTMLAttributes<HTMLDivElement>, AIComponentProps {
  text?: string;
}

export function TypingIndicator({
  text = 'Procesando...',
  loading = false,
  disabled = false,
  className = '',
  ...props
}: TypingIndicatorProps) {
  const combinedClassName = `flex items-center gap-3 p-4 ${className}`.trim();

  return (
    <div className={combinedClassName} aria-live="polite" {...props}>
      <Spinner className="w-4 h-4 text-brandPrimary" />
      <Text size="sm" className="text-textPrimary/70 animate-pulse">
        {text}
      </Text>
    </div>
  );
}
