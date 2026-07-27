import { MembershipRepository } from '../../application/ports/MembershipRepository';
import { Membership } from '../../domain/identity/Membership';

export class MockMembershipRepository implements MembershipRepository {
  async getMembershipsForIdentity(identityId: string): Promise<Membership[]> {
    // Return mock data for development
    return [
      {
        id: 'mem-1234-uuid',
        identityId,
        tenantId: 'tenant-imss',
        centerId: 'center-norte',
        roleId: 'role-director',
        status: 'ACTIVE',
        validFrom: new Date().toISOString(),
        assignment: {
          assignedBy: 'system',
          assignedAt: new Date().toISOString()
        }
      },
      {
        id: 'mem-5678-uuid',
        identityId,
        tenantId: 'tenant-imss',
        centerId: 'center-sur',
        roleId: 'role-tutor',
        status: 'ACTIVE',
        validFrom: new Date().toISOString(),
        assignment: {
          assignedBy: 'system',
          assignedAt: new Date().toISOString()
        }
      }
    ];
  }
}
