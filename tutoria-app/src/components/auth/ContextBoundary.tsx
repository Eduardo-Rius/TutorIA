import React from 'react';
import { useMembership } from '../../providers/MembershipProvider';

export interface ContextBoundaryProps {
  loading: React.ReactNode;
  noMemberships: React.ReactNode;
  selector: React.ReactNode;
  children: React.ReactNode;
}

export const ContextBoundary: React.FC<ContextBoundaryProps> = ({
  loading,
  noMemberships,
  selector,
  children
}) => {
  const { contextState } = useMembership();

  if (contextState.status === 'UNKNOWN' || contextState.status === 'LOADING') {
    return <>{loading}</>;
  }

  if (contextState.status === 'NO_MEMBERSHIPS' || contextState.status === 'ERROR') {
    return <>{noMemberships}</>;
  }

  if (contextState.status === 'SELECTING_CONTEXT') {
    return <>{selector}</>;
  }

  return <>{children}</>;
};
