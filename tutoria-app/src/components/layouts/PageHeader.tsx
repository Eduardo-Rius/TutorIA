import React from 'react';
import { Stack, Inline } from '../foundations';
import { Heading, Text } from '../primitives';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  actionsSlot?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  actionsSlot,
  className = '',
  ...props
}: PageHeaderProps) {
  const combinedClassName = `mb-8 ${className}`.trim();

  return (
    <header className={combinedClassName} {...props}>
      <div className="md:flex md:items-center md:justify-between">
        <Stack gap={1} className="flex-1 min-w-0">
          <Heading as="h1" size="3xl" weight={700} className="truncate">
            {title}
          </Heading>
          {subtitle && (
            <Text size="md" className="text-textPrimary/70 truncate">
              {subtitle}
            </Text>
          )}
        </Stack>
        {actionsSlot && (
          <div className="mt-4 flex md:mt-0 md:ml-4">
            {actionsSlot}
          </div>
        )}
      </div>
    </header>
  );
}
