import React from 'react';
import { Stack } from '../foundations';
import { Heading, Text } from '../primitives';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actionSlot?: React.ReactNode;
}

export function ErrorState({
  title,
  description,
  actionSlot,
  className = '',
  ...props
}: ErrorStateProps) {
  // ARB DIRECTIVE: Deferred semantic colors. Relying on structural markup and typography.
  const combinedClassName = `text-center py-12 px-4 sm:px-6 lg:px-8 border-2 border-solid border-textPrimary/10 rounded-lg bg-surfacePrimary ${className}`.trim();

  return (
    <div className={combinedClassName} role="alert" {...props}>
      <Stack align="center" gap={3}>
        <Heading as="h3" size="lg" weight={700}>
          {title}
        </Heading>
        {description && (
          <Text size="md" className="max-w-md mx-auto">
            {description}
          </Text>
        )}
        {actionSlot && (
          <div className="mt-6">
            {actionSlot}
          </div>
        )}
      </Stack>
    </div>
  );
}
