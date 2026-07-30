import { MockAuthenticationProvider } from '../infrastructure/authentication/MockAuthenticationProvider';
import { AuthenticationProvider } from '../application/ports/AuthenticationProvider';
import { MembershipRepository } from '../application/ports/MembershipRepository';
import { MockMembershipRepository } from '../infrastructure/identity/MockMembershipRepository';
import { WorkspaceSeedRepository } from '../application/ports/WorkspaceSeedRepository';
import { MockWorkspaceSeedRepository } from '../infrastructure/workspace/MockWorkspaceSeedRepository';
import { PlanningRepository } from '../application/ports/PlanningRepository';
import { MockPlanningRepository } from '../infrastructure/planning/MockPlanningRepository';
import { PedagogicalReviewProvider } from '../application/ports/PedagogicalReviewProvider';
import { MockPedagogicalReviewProvider } from '../infrastructure/planning/MockPedagogicalReviewProvider';

export interface InfrastructureContext {
  authProvider: AuthenticationProvider;
  membershipRepository: MembershipRepository;
  workspaceSeedRepository: WorkspaceSeedRepository;
  planningRepository: PlanningRepository;
  pedagogicalReviewProvider: PedagogicalReviewProvider;
}

export function createInfrastructure(): InfrastructureContext {
  const authProvider = new MockAuthenticationProvider();
  const membershipRepository = new MockMembershipRepository();
  const workspaceSeedRepository = new MockWorkspaceSeedRepository();
  const planningRepository = new MockPlanningRepository();
  const pedagogicalReviewProvider = new MockPedagogicalReviewProvider();

  return {
    authProvider,
    membershipRepository,
    workspaceSeedRepository,
    planningRepository,
    pedagogicalReviewProvider
  };
}
