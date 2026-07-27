import React from 'react';

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
  const combinedClassName = `min-h-screen flex flex-col md:flex-row bg-surfacePrimary ${className}`.trim();

  return (
    <div className={combinedClassName} {...props}>
      {sidebar && (
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          {sidebar}
        </div>
      )}
      <div className={`flex flex-col flex-1 w-full ${sidebar ? 'md:pl-64' : ''}`}>
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
