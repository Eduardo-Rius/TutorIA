import React from 'react';
import type { Radius, Shadows } from '../../theme';

export type SurfaceElement = 'div' | 'section' | 'article' | 'aside' | 'main' | 'header' | 'footer' | 'nav';

export interface SurfaceProps extends React.HTMLAttributes<HTMLElement> {
  as?: SurfaceElement;
  elevation?: keyof Shadows;
  radius?: keyof Radius;
  withBorder?: boolean;
}

const shadowClasses: Record<keyof Shadows, string> = {
  none: 'shadow-none',
  xs: 'shadow-xs',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
};

const radiusClasses: Record<keyof Radius, string> = {
  none: 'rounded-none',
  xs: 'rounded-xs',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  pill: 'rounded-pill',
  circle: 'rounded-circle',
};

export function Surface({
  as: Component = 'div',
  elevation = 'none',
  radius = 'none',
  withBorder = false,
  className = '',
  children,
  ...props
}: SurfaceProps) {
  // REMEDIATION 02: Removed non-existent text-textPrimary
  const baseClasses = 'bg-surfacePrimary';
  const shadowClass = shadowClasses[elevation];
  const radiusClass = radiusClasses[radius];
  // REMEDIATION 02: Fallback border color removed since gray-200 doesn't exist
  // We use brandPrimary with opacity or just leave without border until tokens exist
  const borderClass = withBorder ? 'border border-brandPrimary/10' : '';

  const combinedClassName = `${baseClasses} ${shadowClass} ${radiusClass} ${borderClass} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <Component {...props} className={combinedClassName}>
      {children}
    </Component>
  );
}
