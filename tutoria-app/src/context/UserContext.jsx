/* eslint-disable react-refresh/only-export-components */
import { createContext } from 'react';
import { useAuth } from '../hooks/useAuth';

export const UserContext = createContext();

// Capa de compatibilidad para no romper las dependencias existentes
export const UserProvider = ({ children }) => {
  const authState = useAuth();
  
  return (
    <UserContext.Provider value={authState}>
      {children}
    </UserContext.Provider>
  );
};

// Hook de compatibilidad que redirige internamente a useAuth
export const useUser = () => {
  return useAuth();
};
