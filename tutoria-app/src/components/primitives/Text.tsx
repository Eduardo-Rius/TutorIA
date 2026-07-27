import React from 'react';
import type { Typography } from '../../theme';

// REMEDIATION 08: Remove label
export type TextElement = 'p' | 'span' | 'div' | 'strong' | 'em';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: TextElement;
  size?: keyof Typography['sizes'];
  weight?: keyof Typography['weights'];
  color?: 'primary' | 'secondary' | 'accent' | 'inherit';
}

const sizeClasses: Record<keyof Typography['sizes'], string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-md',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
};

const weightClasses: Record<keyof Typography['weights'], string> = {
  300: 'font-light',
  400: 'font-normal',
  500: 'font-medium',
  600: 'font-semibold',
  700: 'font-bold',
  800: 'font-extrabold',
};

const colorClasses = {
  primary: 'text-brandPrimary',
  secondary: 'text-brandSecondary',
  accent: 'text-brandAccent',
  inherit: 'text-inherit',
};

export function Text({
  as: Component = 'p',
  size = 'md',
  weight = 400,
  color = 'inherit',
  className = '',
  children,
  ...props
}: TextProps) {
  const combinedClassName = `${sizeClasses[size]} ${weightClasses[weight]} ${colorClasses[color]} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <Component {...props} className={combinedClassName}>
      {children}
    </Component>
  );
}
