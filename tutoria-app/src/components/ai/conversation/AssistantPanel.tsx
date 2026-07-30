import React from 'react';
import { Surface, Stack } from '../../foundations';
import { Heading, Text } from '../../primitives';
import { AIComponentProps } from '../shared/types';

export interface AssistantPanelProps extends React.HTMLAttributes<HTMLElement>, AIComponentProps {
  title?: string;
  subtitle?: string;
  actionsSlot?: React.ReactNode;
}

export function AssistantPanel({
  title,
  subtitle,
  actionsSlot,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}: AssistantPanelProps) {
  const combinedClassName = `flex flex-col h-full overflow-hidden ${
    disabled || loading ? 'opacity-70 pointer-events-none' : ''
  } ${className}`.trim();

  return (
    <Surface as="section" className={combinedClassName} {...props}>
      {(title || subtitle || actionsSlot) && (
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-brandPrimary/10">
          <Stack gap={1}>
            {title && (
              <Heading as="h2" size="lg" weight={700}>
                {title}
              </Heading>
            )}
            {subtitle && (
              <Text size="sm" className="text-textPrimary/60">
                {subtitle}
              </Text>
            )}
          </Stack>
          {actionsSlot && <div>{actionsSlot}</div>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
        {children}
      </div>
    </Surface>
  );
}
