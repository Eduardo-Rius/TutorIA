import { FirebaseAuthenticationProvider } from '../infrastructure/authentication/FirebaseAuthenticationProvider';
import { AuthenticationProvider } from '../application/ports/AuthenticationProvider';

export interface InfrastructureContext {
  authProvider: AuthenticationProvider;
}

export function createInfrastructure(): InfrastructureContext {
  const authProvider = new FirebaseAuthenticationProvider();

  return {
    authProvider
  };
}
