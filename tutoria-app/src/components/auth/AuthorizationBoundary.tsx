import React from 'react';
import { useSession } from '../../providers/SessionProvider';

export interface AuthorizationBoundaryProps {
  unauthorized: React.ReactNode;
  loading: React.ReactNode;
  children: React.ReactNode;
}

export const AuthorizationBoundary: React.FC<AuthorizationBoundaryProps> = ({
  unauthorized,
  loading,
  children
}) => {
  const { session } = useSession();

  if (session.status === 'UNKNOWN' || session.status === 'RESTORING') {
    return <>{loading}</>;
  }

  if (session.status === 'UNAUTHENTICATED' || session.status === 'ERROR') {
    return <>{unauthorized}</>;
  }

  return <>{children}</>;
};
