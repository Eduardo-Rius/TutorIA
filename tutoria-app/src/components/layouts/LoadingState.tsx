import React from 'react';
import { Stack } from '../foundations';
import { Text } from '../primitives';
import { Spinner } from '../internal/Spinner';

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
}

export function LoadingState({
  text = 'Cargando...',
  className = '',
  ...props
}: LoadingStateProps) {
  const combinedClassName = `flex items-center justify-center min-h-[200px] w-full ${className}`.trim();

  return (
    <div className={combinedClassName} aria-live="polite" aria-busy="true" {...props}>
      <Stack align="center" gap={4}>
        <Spinner className="h-8 w-8 text-brandPrimary" />
        <Text size="sm" weight={500} className="text-brandPrimary">
          {text}
        </Text>
      </Stack>
    </div>
  );
}
