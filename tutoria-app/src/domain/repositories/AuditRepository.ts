import { Repository } from '../../shared/kernel/Repository';
import { AuditId } from '../../shared/value-objects/Ids';

export interface Audit {}

export interface AuditRepository extends Repository<Audit, AuditId> {}
