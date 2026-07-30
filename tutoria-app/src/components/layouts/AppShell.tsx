import React from 'react';
import logoSrc from '../../assets/brand/logos/imagotype/TutorIA_Imagotype_Transparent.png';

import { Sidebar } from './Sidebar';

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
}

export function AppShell({
  sidebar,
  topbar,
  className = '',
  children,
  ...props
}: AppShellProps) {
  const defaultSidebar = <Sidebar />;

  const activeSidebar = sidebar || defaultSidebar;

  const combinedClassName = `min-h-screen flex flex-col md:flex-row bg-surfacePrimary ${className}`.trim();

  return (
    <div className={combinedClassName} {...props}>
      {activeSidebar && (
        <div className="hidden md:flex md:w-[280px] md:flex-col md:fixed md:inset-y-0 z-20">
          {activeSidebar}
        </div>
      )}
      <div className={`flex flex-col flex-1 w-full ${activeSidebar ? 'md:pl-[280px]' : ''}`}>
        {topbar && (
          <div className="sticky top-0 z-10">
            {topbar}
          </div>
        )}
        <main className="flex-1 overflow-y-auto outline-none" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
