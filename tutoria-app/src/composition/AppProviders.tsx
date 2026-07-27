import React, { createContext, useContext } from 'react';
import { InfrastructureContext } from './createInfrastructure';
import { ApplicationContext } from './createApplication';
import { SessionProvider } from '../providers/SessionProvider';
import { MembershipProvider } from '../providers/MembershipProvider';

export interface AppProvidersProps {
  infra: InfrastructureContext;
  app: ApplicationContext;
  children: React.ReactNode;
}

const InfraContext = createContext<InfrastructureContext | undefined>(undefined);

export const AppProviders: React.FC<AppProvidersProps> = ({ infra, children }) => {
  return (
    <InfraContext.Provider value={infra}>
      <SessionProvider authProvider={infra.authProvider}>
        <MembershipProvider membershipRepository={infra.membershipRepository}>
          {children}
        </MembershipProvider>
      </SessionProvider>
    </InfraContext.Provider>
  );
};

export const useInfrastructure = () => {
  const ctx = useContext(InfraContext);
  if (!ctx) throw new Error('useInfrastructure must be used within AppProviders');
  return ctx;
};
