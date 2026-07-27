import React from 'react';
import type { Typography } from '../../theme';

export type HeadingElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

type HeadingSizes = Extract<keyof Typography['sizes'], 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'>;
type HeadingWeights = Extract<keyof Typography['weights'], 500 | 600 | 700 | 800>;

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingElement;
  size?: HeadingSizes;
  weight?: HeadingWeights;
}

const sizeClasses: Record<HeadingSizes, string> = {
  md: 'text-md',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
};

const weightClasses: Record<HeadingWeights, string> = {
  500: 'font-medium',
  600: 'font-semibold',
  700: 'font-bold',
  800: 'font-extrabold',
};

export function Heading({
  as: Component = 'h2',
  size = 'xl',
  weight = 700,
  className = '',
  children,
  ...props
}: HeadingProps) {
  const combinedClassName = `text-brandPrimary ${sizeClasses[size]} ${weightClasses[weight]} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <Component {...props} className={combinedClassName}>
      {children}
    </Component>
  );
}
