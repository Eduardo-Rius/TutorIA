import React from 'react';
import { Stack } from '../foundations';
import { Heading, Text } from '../primitives';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  iconSlot?: React.ReactNode;
  title: string;
  description?: string;
  actionSlot?: React.ReactNode;
}

export function EmptyState({
  iconSlot,
  title,
  description,
  actionSlot,
  className = '',
  ...props
}: EmptyStateProps) {
  const combinedClassName = `text-center py-12 px-4 sm:px-6 lg:px-8 border-2 border-dashed border-brandPrimary/20 rounded-lg ${className}`.trim();

  return (
    <div className={combinedClassName} {...props}>
      <Stack align="center" gap={3}>
        {iconSlot && (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-brandPrimary/10 text-brandPrimary">
            {iconSlot}
          </div>
        )}
        <Heading as="h3" size="lg" weight={600}>
          {title}
        </Heading>
        {description && (
          <Text size="sm" className="text-textPrimary/70 max-w-sm mx-auto">
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
