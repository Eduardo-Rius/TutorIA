import React from 'react';
import { InfrastructureContext } from './createInfrastructure';
import { ApplicationContext } from './createApplication';
import { SessionProvider } from '../providers/SessionProvider';

export interface AppProvidersProps {
  infra: InfrastructureContext;
  app: ApplicationContext;
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ infra, children }) => {
  return (
    <SessionProvider authProvider={infra.authProvider}>
      {children}
    </SessionProvider>
  );
};
