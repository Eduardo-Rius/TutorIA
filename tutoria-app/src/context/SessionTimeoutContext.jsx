/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { logoutUsuario } from '../services/authService';
import { getTimeoutMilliseconds, getWarningMilliseconds, setLastActivity, getLastActivity, clearSessionData } from '../services/sessionService';

export const SessionTimeoutContext = createContext();

export const SessionTimeoutProvider = ({ children }) => {
  const { user } = useAuth();
  const [showWarning, setShowWarning] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      await logoutUsuario();
      clearSessionData();
      setShowWarning(false);
    } catch (error) {
      console.error("Error al cerrar sesión por inactividad:", error);
    }
  }, []);

  const checkActivity = useCallback(() => {
    if (!user) return;

    const now = Date.now();
    const lastActive = getLastActivity();
    const inactiveTime = now - lastActive;

    const timeoutMs = getTimeoutMilliseconds();
    const warningMs = getWarningMilliseconds();

    if (inactiveTime >= timeoutMs) {
      handleLogout();
    } else if (inactiveTime >= (timeoutMs - warningMs)) {
      if (!showWarning) setShowWarning(true);
    } else {
      if (showWarning) setShowWarning(false);
    }
  }, [user, showWarning, handleLogout]);

  useEffect(() => {
    // Reset timer on user interaction
    const resetTimer = () => {
      setLastActivity();
      if (showWarning) setShowWarning(false);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    if (user) {
      // Initialize activity time when user logs in
      setLastActivity();
      
      events.forEach(e => document.addEventListener(e, resetTimer));
      
      // Check every 5 seconds (performance optimization for 15-second warning precision)
      const intervalId = setInterval(checkActivity, 5000);

      return () => {
        events.forEach(e => document.removeEventListener(e, resetTimer));
        clearInterval(intervalId);
      };
    }
  }, [user, showWarning, checkActivity]);

  return (
    <SessionTimeoutContext.Provider value={{ showWarning, handleLogout, resetTimer: () => { setLastActivity(); setShowWarning(false); } }}>
      {children}
    </SessionTimeoutContext.Provider>
  );
};
