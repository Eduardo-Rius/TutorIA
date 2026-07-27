import { Repository } from '../../shared/kernel/Repository';
import { TenantId } from '../../shared/value-objects/Ids';
import { Tenant } from '../tenant/Tenant';

export interface TenantRepository extends Repository<Tenant, TenantId> {
  // Can define specific methods here if needed in the future, e.g.:
  // findByName(name: string): Promise<Tenant | null>;
}
