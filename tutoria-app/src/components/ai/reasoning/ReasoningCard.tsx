import React from 'react';
import { Panel } from '../../layouts';
import { Stack, Inline } from '../../foundations';
import { Heading, Text } from '../../primitives';
import { AIComponentProps } from '../shared/types';

export interface ReasoningCardProps extends React.HTMLAttributes<HTMLDivElement>, AIComponentProps {
  title: string;
  iconSlot?: React.ReactNode;
}

export function ReasoningCard({
  title,
  iconSlot,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}: ReasoningCardProps) {
  // Not exposing internal AI thinking logic, just an explanation container.
  const combinedClassName = `bg-brandPrimary/5 border-none ${
    disabled || loading ? 'opacity-50' : ''
  } ${className}`.trim();

  return (
    <Panel className={combinedClassName} {...props}>
      <Stack gap={3}>
        <Inline gap={2} align="center" className="text-brandPrimary">
          {iconSlot}
          <Heading as="h4" size="md" weight={600}>
            {title}
          </Heading>
        </Inline>
        <div className="text-sm text-textPrimary/80 leading-relaxed">
          {children}
        </div>
      </Stack>
    </Panel>
  );
}
