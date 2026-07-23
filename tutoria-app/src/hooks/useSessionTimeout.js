import { useContext } from 'react';
import { SessionTimeoutContext } from '../context/SessionTimeoutContext';

export const useSessionTimeout = () => {
  const context = useContext(SessionTimeoutContext);
  if (context === undefined) {
    throw new Error('useSessionTimeout must be used within a SessionTimeoutProvider');
  }
  return context;
};
