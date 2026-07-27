import React from 'react';
import type { Spacing } from '../../theme';

export type InlineElement = 'div' | 'section' | 'article' | 'ul' | 'ol' | 'li' | 'header' | 'footer' | 'nav';

export interface InlineProps extends React.HTMLAttributes<HTMLElement> {
  as?: InlineElement;
  gap?: keyof Spacing;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
}

const gapClasses: Record<keyof Spacing, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
  16: 'gap-16',
  20: 'gap-20',
  24: 'gap-24',
};

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline'
} as const;

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around'
} as const;

export function Inline({
  as: Component = 'div',
  gap = 4,
  align = 'center',
  justify = 'start',
  wrap = true,
  className = '',
  children,
  ...props
}: InlineProps) {
  const wrapClass = wrap ? 'flex-wrap' : 'flex-nowrap';
  const combinedClassName = `flex flex-row ${wrapClass} ${gapClasses[gap]} ${alignClasses[align]} ${justifyClasses[justify]} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <Component {...props} className={combinedClassName}>
      {children}
    </Component>
  );
}
