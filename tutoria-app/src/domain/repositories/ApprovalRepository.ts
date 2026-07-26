import { Repository } from '../../shared/kernel/Repository';
import { ApprovalId } from '../../shared/value-objects/Ids';

export interface Approval {}

export interface ApprovalRepository extends Repository<Approval, ApprovalId> {}
