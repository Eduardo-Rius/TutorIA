import { Membership } from '../../domain/identity/Membership';

export interface MembershipRepository {
  getMembershipsForIdentity(identityId: string): Promise<Membership[]>;
}
