import { FirebaseAuthenticationProvider } from '../infrastructure/authentication/FirebaseAuthenticationProvider';
import { AuthenticationProvider } from '../application/ports/AuthenticationProvider';
import { MembershipRepository } from '../application/ports/MembershipRepository';
import { MockMembershipRepository } from '../infrastructure/identity/MockMembershipRepository';
import { WorkspaceSeedRepository } from '../application/ports/WorkspaceSeedRepository';
import { MockWorkspaceSeedRepository } from '../infrastructure/workspace/MockWorkspaceSeedRepository';

export interface InfrastructureContext {
  authProvider: AuthenticationProvider;
  membershipRepository: MembershipRepository;
  workspaceSeedRepository: WorkspaceSeedRepository;
}

export function createInfrastructure(): InfrastructureContext {
  const authProvider = new FirebaseAuthenticationProvider();
  const membershipRepository = new MockMembershipRepository();
  const workspaceSeedRepository = new MockWorkspaceSeedRepository();

  return {
    authProvider,
    membershipRepository,
    workspaceSeedRepository
  };
}
