import { Repository } from '../../shared/kernel/Repository';
import { PlanningId } from '../../shared/value-objects/Ids';

export interface Planning {}

export interface PlanningRepository extends Repository<Planning, PlanningId> {}
