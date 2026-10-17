import React from 'react';
import logoSrc from '../../assets/brand/logos/imagotype/TutorIA_Imagotype_Transparent.png';

import { Sidebar } from './Sidebar';

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
  roomName?: string;
}

export function AppShell({
  sidebar,
  topbar,
  roomName,
  className = '',
  children,
  ...props
}: AppShellProps) {
  const defaultSidebar = <Sidebar roomName={roomName} />;

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
        <main className="flex-1 overflow-y-auto outline-none flex flex-col" tabIndex={-1}>
          {children}
          <footer
            data-testid="ai-disclaimer-footer"
            className="w-full py-4 px-4 text-center border-t border-gray-200/50 mt-auto print:hidden"
          >
            <p className="text-[11px] sm:text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed">
              La IA puede cometer errores. Toda propuesta requiere revisión y validación del personal educativo responsable.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
