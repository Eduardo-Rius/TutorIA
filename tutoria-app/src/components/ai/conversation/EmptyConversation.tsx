import React from 'react';
import { Stack } from '../../foundations';
import { Heading, Text } from '../../primitives';
import { AIComponentProps } from '../shared/types';

export interface EmptyConversationProps extends React.HTMLAttributes<HTMLDivElement>, AIComponentProps {
  title: string;
  description: string;
  suggestionsSlot?: React.ReactNode;
}

export function EmptyConversation({
  title,
  description,
  suggestionsSlot,
  loading = false,
  disabled = false,
  className = '',
  ...props
}: EmptyConversationProps) {
  const combinedClassName = `flex flex-col items-center justify-center text-center h-full p-6 sm:p-12 ${
    disabled || loading ? 'opacity-50' : ''
  } ${className}`.trim();

  return (
    <div className={combinedClassName} {...props}>
      <Stack align="center" gap={4} className="max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-brandPrimary/10 flex items-center justify-center mb-2">
          {/* Default decorative element waiting for mascot/iconography */}
          <span className="text-2xl text-brandPrimary font-bold" aria-hidden="true">AI</span>
        </div>
        <Heading as="h2" size="2xl" weight={700}>
          {title}
        </Heading>
        <Text size="md" className="text-textPrimary/70">
          {description}
        </Text>
        {suggestionsSlot && (
          <div className="mt-8 w-full text-left">
            {suggestionsSlot}
          </div>
        )}
      </Stack>
    </div>
  );
}
