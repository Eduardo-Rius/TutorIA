export type MembershipStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';

export type Capability = 
  | 'manage:users'
  | 'read:students'
  | 'write:evaluations'
  | 'view:reports';

export interface Policy {
  id: string;
  name: string;
  capabilities: Capability[];
}

export interface PermissionSnapshot {
  calculatedAt: string;
  capabilities: Capability[];
  roles: string[];
}
