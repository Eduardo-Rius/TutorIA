import React from 'react';
import { Surface, type SurfaceProps } from '../foundations';

export interface PanelProps extends SurfaceProps {}

export function Panel({
  className = '',
  children,
  ...props
}: PanelProps) {
  // Uses Surface to provide a standard layout card section without repeating shadow/border logic
  const combinedClassName = `overflow-hidden ${className}`.trim();

  return (
    <Surface
      as="section"
      elevation="sm"
      radius="md"
      withBorder
      className={combinedClassName}
      {...props}
    >
      <div className="px-4 py-5 sm:p-6">
        {children}
      </div>
    </Surface>
  );
}
