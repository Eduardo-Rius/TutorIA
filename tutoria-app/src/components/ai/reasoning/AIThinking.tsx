import React from 'react';
import { Inline } from '../../foundations';
import { Text } from '../../primitives';
import { Spinner } from '../../internal/Spinner';
import { AIComponentProps } from '../shared/types';

export interface AIThinkingProps extends React.HTMLAttributes<HTMLDivElement>, AIComponentProps {
  status?: string;
}

export function AIThinking({
  status = 'Analizando contexto...',
  loading = false,
  disabled = false,
  className = '',
  ...props
}: AIThinkingProps) {
  const combinedClassName = `flex items-center gap-3 py-2 px-3 bg-surfacePrimary rounded-lg border border-textPrimary/5 shadow-sm inline-flex ${className}`.trim();

  return (
    <div className={combinedClassName} aria-live="polite" {...props}>
      <Spinner className="w-3.5 h-3.5 text-brandSecondary" />
      <Text size="xs" weight={500} className="text-textPrimary/70">
        {status}
      </Text>
    </div>
  );
}
