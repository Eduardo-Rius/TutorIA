import React from 'react';
import { InfrastructureContext } from './createInfrastructure';
import { ApplicationContext } from './createApplication';
import { SessionProvider } from '../providers/SessionProvider';
import { MembershipProvider } from '../providers/MembershipProvider';

export interface AppProvidersProps {
  infra: InfrastructureContext;
  app: ApplicationContext;
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ infra, children }) => {
  return (
    <SessionProvider authProvider={infra.authProvider}>
      <MembershipProvider membershipRepository={infra.membershipRepository}>
        {children}
      </MembershipProvider>
    </SessionProvider>
  );
};
