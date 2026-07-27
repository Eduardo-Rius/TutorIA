import { PedagogicalPlan } from '../../domain/planning/PedagogicalPlan';
import { PlanningId, CenterId, GroupId } from '../../shared/value-objects/Ids';

export interface PlanningRepository {
  save(plan: PedagogicalPlan): Promise<void>;
  findById(id: PlanningId): Promise<PedagogicalPlan | null>;
  findByCenterAndGroup(centerId: CenterId, groupId: GroupId): Promise<PedagogicalPlan[]>;
}
