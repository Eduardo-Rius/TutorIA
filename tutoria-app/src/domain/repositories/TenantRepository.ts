import { Repository } from '../../shared/kernel/Repository';
import { TenantId } from '../../shared/value-objects/Ids';

export interface Tenant {}

export interface TenantRepository extends Repository<Tenant, TenantId> {}
