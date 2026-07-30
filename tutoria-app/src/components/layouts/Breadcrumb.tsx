import React from 'react';
import { Inline } from '../foundations';
import { Text } from '../primitives';

export interface BreadcrumbItem {
  id: string;
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  onItemClick?: (item: BreadcrumbItem) => void;
}

export function Breadcrumb({
  items,
  onItemClick,
  className = '',
  ...props
}: BreadcrumbProps) {
  const combinedClassName = `flex ${className}`.trim();

  return (
    <nav aria-label="Breadcrumb" className={combinedClassName} {...props}>
      <Inline as="ol" gap={2} align="center">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.id} className="flex items-center">
              {isLast ? (
                <Text size="sm" weight={600} color="primary" aria-current="page">
                  {item.label}
                </Text>
              ) : (
                <div className="flex items-center">
                  <a
                    href={item.href || '#'}
                    onClick={(e) => {
                      if (!item.href) e.preventDefault();
                      onItemClick?.(item);
                    }}
                    className="text-sm font-medium text-textPrimary/60 hover:text-brandPrimary transition-colors"
                  >
                    {item.label}
                  </a>
                  <span className="ml-2 text-textPrimary/30" aria-hidden="true">
                    /
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </Inline>
    </nav>
  );
}
