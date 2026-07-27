import { FirebaseAuthenticationProvider } from '../infrastructure/authentication/FirebaseAuthenticationProvider';
import { AuthenticationProvider } from '../application/ports/AuthenticationProvider';
import { MembershipRepository } from '../application/ports/MembershipRepository';
import { MockMembershipRepository } from '../infrastructure/identity/MockMembershipRepository';

export interface InfrastructureContext {
  authProvider: AuthenticationProvider;
  membershipRepository: MembershipRepository;
}

export function createInfrastructure(): InfrastructureContext {
  const authProvider = new FirebaseAuthenticationProvider();
  const membershipRepository = new MockMembershipRepository();

  return {
    authProvider,
    membershipRepository
  };
}
