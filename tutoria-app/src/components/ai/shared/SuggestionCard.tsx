import React from 'react';
import { Surface, Stack } from '../../foundations';
import { Heading, Text } from '../../primitives';
import { AIComponentProps } from './types';

export interface SuggestionCardProps extends React.HTMLAttributes<HTMLDivElement>, AIComponentProps {
  title: string;
  description: string;
  iconSlot?: React.ReactNode;
  onSelect?: () => void;
}

export function SuggestionCard({
  title,
  description,
  iconSlot,
  onSelect,
  loading = false,
  disabled = false,
  className = '',
  ...props
}: SuggestionCardProps) {
  const isInteractive = !!onSelect && !disabled && !loading;
  const combinedClassName = `p-4 sm:p-5 transition-colors ${
    isInteractive ? 'cursor-pointer hover:bg-surfacePrimary hover:border-brandPrimary/30' : ''
  } ${disabled || loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`.trim();

  return (
    <Surface 
      as="div" 
      radius="md" 
      elevation="none" 
      withBorder 
      className={combinedClassName}
      onClick={isInteractive ? onSelect : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      {...props}
    >
      <Stack gap={3}>
        <div className="flex items-center gap-3">
          {iconSlot && (
            <div className="flex-shrink-0 text-brandPrimary">
              {iconSlot}
            </div>
          )}
          <Heading as="h4" size="md" weight={600} className="text-brandPrimary">
            {title}
          </Heading>
        </div>
        <Text size="sm" className="text-textPrimary/80">
          {description}
        </Text>
      </Stack>
    </Surface>
  );
}
