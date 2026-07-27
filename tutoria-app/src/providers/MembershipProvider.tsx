import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { MembershipRepository } from '../application/ports/MembershipRepository';
import { InstitutionContextState } from '../application/identity/InstitutionContextState';
import { Membership } from '../domain/identity/Membership';
import { useSession } from './SessionProvider';

interface MembershipContextValue {
  contextState: InstitutionContextState;
  selectContext: (membershipId: string) => void;
  refreshMemberships: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextValue | undefined>(undefined);

export const MembershipProvider: React.FC<{
  membershipRepository: MembershipRepository;
  children: React.ReactNode;
}> = ({ membershipRepository, children }) => {
  const { session } = useSession();
  const [contextState, setContextState] = useState<InstitutionContextState>({
    status: 'UNKNOWN',
    availableMemberships: []
  });

  const loadMemberships = useCallback(async () => {
    if (session.status !== 'AUTHENTICATED' || !session.userId) {
      setContextState({ status: 'UNKNOWN', availableMemberships: [] });
      return;
    }

    setContextState((prev) => ({ ...prev, status: 'LOADING' }));
    try {
      const memberships = await membershipRepository.getMembershipsForIdentity(session.userId);
      
      if (memberships.length === 0) {
        setContextState({ status: 'NO_MEMBERSHIPS', availableMemberships: [] });
      } else if (memberships.length === 1 && memberships[0]) {
        // Auto-select if only one membership
        setContextState({
          status: 'CONTEXT_ACTIVE',
          availableMemberships: memberships,
          activeContext: { membership: memberships[0] }
        });
      } else {
        // Must select context
        setContextState({
          status: 'SELECTING_CONTEXT',
          availableMemberships: memberships
        });
      }
    } catch (err) {
      setContextState({ 
        status: 'ERROR', 
        availableMemberships: [], 
        error: err instanceof Error ? err.message : 'Unknown error loading memberships' 
      });
    }
  }, [session.status, session.userId, membershipRepository]);

  useEffect(() => {
    loadMemberships();
  }, [loadMemberships]);

  const selectContext = (membershipId: string) => {
    const membership = contextState.availableMemberships.find(m => m.id === membershipId);
    if (membership) {
      setContextState(prev => ({
        ...prev,
        status: 'CONTEXT_ACTIVE',
        activeContext: { membership }
      }));
    }
  };

  return (
    <MembershipContext.Provider value={{ contextState, selectContext, refreshMemberships: loadMemberships }}>
      {children}
    </MembershipContext.Provider>
  );
};

export const useMembership = () => {
  const ctx = useContext(MembershipContext);
  if (!ctx) throw new Error('useMembership must be used within MembershipProvider');
  return ctx;
};
