import { PlanningRepository } from '../../application/ports/PlanningRepository';
import { PedagogicalPlan } from '../../domain/planning/PedagogicalPlan';
import { PlanningId, CenterId, GroupId } from '../../shared/value-objects/Ids';

export class MockPlanningRepository implements PlanningRepository {
  private plans: Map<string, PedagogicalPlan> = new Map();

  async save(plan: PedagogicalPlan): Promise<void> {
    this.plans.set(plan.id.toString(), plan);
  }

  async findById(id: PlanningId): Promise<PedagogicalPlan | null> {
    const plan = this.plans.get(id.toString());
    return plan || null;
  }

  async findByCenterAndGroup(centerId: CenterId, groupId: GroupId): Promise<PedagogicalPlan[]> {
    return Array.from(this.plans.values()).filter(p =>
      p.centerId.equals(centerId) && p.groupId.equals(groupId)
    );
  }
}
