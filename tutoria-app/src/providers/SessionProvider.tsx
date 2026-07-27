import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthenticationProvider } from '../application/ports/AuthenticationProvider';
import { Session, SessionStatus } from '../application/auth/SessionState';

interface SessionContextValue {
  session: Session;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider: React.FC<{
  authProvider: AuthenticationProvider;
  children: React.ReactNode;
}> = ({ authProvider, children }) => {
  const [session, setSession] = useState<Session>({ status: 'UNKNOWN' });

  const refresh = useCallback(async () => {
    setSession({ status: 'RESTORING' });
    try {
      const userId = await authProvider.restoreSession();
      if (userId) {
        setSession({ status: 'AUTHENTICATED', userId });
      } else {
        setSession({ status: 'UNAUTHENTICATED' });
      }
    } catch {
      setSession({ status: 'ERROR', error: 'Failed to restore session' });
    }
  }, [authProvider]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    setSession((prev) => ({ ...prev, status: 'RESTORING' }));
    try {
      await authProvider.login(email, password);
      // restoreSession will handle the status update via onAuthStateChanged
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSession({ status: 'ERROR', error: err.message });
      } else {
        setSession({ status: 'ERROR', error: 'Unknown error' });
      }
    }
  };

  const logout = async () => {
    await authProvider.logout();
  };

  return (
    <SessionContext.Provider value={{ session, login, logout, refresh }}>
      {children}
    </SessionContext.Provider>
  );
};



export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};
