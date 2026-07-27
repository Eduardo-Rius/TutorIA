import React from 'react';
import { Surface, Stack, Spacer } from '../foundations';
import { Text, Icon } from '../primitives';

export interface NavigationItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  href?: string;
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  items?: NavigationItem[];
  onItemClick?: (item: NavigationItem) => void;
}

export function Sidebar({
  headerSlot,
  footerSlot,
  items = [],
  onItemClick,
  className = '',
  ...props
}: SidebarProps) {
  const combinedClassName = `flex flex-col flex-1 h-full border-r border-brandPrimary/10 ${className}`.trim();

  return (
    <Surface as="aside" className={combinedClassName} {...props}>
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        {headerSlot && (
          <div className="flex items-center shrink-0 px-4 mb-4">
            {headerSlot}
          </div>
        )}
        
        <nav className="mt-5 flex-1 px-2 space-y-1" aria-label="Sidebar">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.href || '#'}
              onClick={(e) => {
                if (!item.href) e.preventDefault();
                onItemClick?.(item);
              }}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                item.active 
                  ? 'bg-brandPrimary/10 text-brandPrimary' 
                  : 'text-textPrimary hover:bg-brandPrimary/5'
              }`}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.icon && (
                <span className={`mr-3 flex-shrink-0 ${item.active ? 'text-brandPrimary' : 'text-textPrimary/50'}`}>
                  {item.icon}
                </span>
              )}
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      {footerSlot && (
        <div className="shrink-0 flex border-t border-brandPrimary/10 p-4">
          {footerSlot}
        </div>
      )}
    </Surface>
  );
}
