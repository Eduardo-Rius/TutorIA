import React from 'react';
import { Stack, Inline } from '../../foundations';
import { Text } from '../../primitives';
import { AIComponentProps } from '../shared/types';

export interface AIResponseProps extends React.HTMLAttributes<HTMLDivElement>, AIComponentProps {
  timestampSlot?: React.ReactNode;
  sourcesSlot?: React.ReactNode;
  confidenceSlot?: React.ReactNode;
}

export function AIResponse({
  timestampSlot,
  sourcesSlot,
  confidenceSlot,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}: AIResponseProps) {
  const combinedClassName = `flex flex-col gap-3 ${className}`.trim();

  return (
    <div className={combinedClassName} {...props}>
      <div className="prose prose-sm max-w-none">
        {/* Children contains the actual response text, lists, or structured components */}
        {children}
      </div>

      {(sourcesSlot || confidenceSlot || timestampSlot) && (
        <Inline gap={4} align="center" className="mt-2 pt-3 border-t border-brandPrimary/10">
          {confidenceSlot && <div>{confidenceSlot}</div>}
          {sourcesSlot && <div>{sourcesSlot}</div>}
          {timestampSlot && <div className="ml-auto">{timestampSlot}</div>}
        </Inline>
      )}
    </div>
  );
}
