import { MembershipStatus, PermissionSnapshot } from './types';

export interface MembershipAssignment {
  assignedBy: string; // IdentityID of the assigner
  assignedAt: string;
  reason?: string;
}

export interface Membership {
  id: string; // Independent UUID
  identityId: string;
  tenantId: string;
  institutionId?: string;
  zoneId?: string;
  centerId?: string;
  roleId: string;
  
  status: MembershipStatus;
  validFrom: string;
  validUntil?: string;
  
  assignment: MembershipAssignment;
  permissionSnapshot?: PermissionSnapshot; // For runtime evaluation if needed
}
