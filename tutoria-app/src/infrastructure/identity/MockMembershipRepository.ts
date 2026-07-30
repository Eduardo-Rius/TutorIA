import { MembershipRepository } from '../../application/ports/MembershipRepository';
import { Membership } from '../../domain/identity/Membership';

export class MockMembershipRepository implements MembershipRepository {
  async getMembershipsForIdentity(identityId: string): Promise<Membership[]> {
    // Return mock data for development
    return [
      {
        id: 'mem-demo-1',
        identityId,
        tenantId: 'Centro Infantil TutorIA',
        centerId: 'Guardería Demo 001',
        roleId: 'Docente',
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
