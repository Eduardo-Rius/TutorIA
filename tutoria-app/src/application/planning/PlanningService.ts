import { PlanningRepository } from '../ports/PlanningRepository';
import { PedagogicalReviewProvider } from '../ports/PedagogicalReviewProvider';
import { PedagogicalPlan } from '../../domain/planning/PedagogicalPlan';
import { Result } from '../../shared/result/Result';
import {
  CreatePlanCommand,
  ReadyForReviewCommand,
  SubmitForReviewCommand,
  ApprovePlanCommand,
  RejectPlanCommand,
  ReturnForCorrectionCommand,
  AmendPlanCommand
} from '../../domain/planning/Commands';
import { PlanningId } from '../../shared/value-objects/Ids';

export class PlanningService {
  constructor(
    private readonly repository: PlanningRepository,
    private readonly reviewProvider: PedagogicalReviewProvider
  ) {}

  async createPlan(command: CreatePlanCommand): Promise<Result<PlanningId>> {
    const plan = PedagogicalPlan.create(
      command.authorId,
      command.centerId,
      command.groupId,
      command.cycleId,
      command.validFrom,
      command.validUntil
    );
    await this.repository.save(plan);
    return Result.ok(plan.id);
  }

  async markReadyForReview(planId: PlanningId, command: ReadyForReviewCommand): Promise<Result<void>> {
    const plan = await this.repository.findById(planId);
    if (!plan) return Result.fail('Plan not found');

    const result = plan.readyForReview(command.authorId);
    if (result.isFailure) return result;

    await this.repository.save(plan);
    return Result.ok();
  }

  async submitForReview(planId: PlanningId, command: SubmitForReviewCommand): Promise<Result<void>> {
    const plan = await this.repository.findById(planId);
    if (!plan) return Result.fail('Plan not found');

    // Here we ensure it was ready, but actually the command needs to be executed
    // Let's assume the UI already marked it ready, or we do it atomically
    const result = plan.submitForReview();
    if (result.isFailure) return result;

    await this.repository.save(plan);
    return Result.ok();
  }

  async approvePlan(planId: PlanningId, command: ApprovePlanCommand): Promise<Result<void>> {
    const plan = await this.repository.findById(planId);
    if (!plan) return Result.fail('Plan not found');

    // Domain enforces rules like SoD
    const result = plan.approve(command);
    if (result.isFailure) return result;

    await this.repository.save(plan);
    return Result.ok();
  }

  async rejectPlan(planId: PlanningId, command: RejectPlanCommand): Promise<Result<void>> {
    const plan = await this.repository.findById(planId);
    if (!plan) return Result.fail('Plan not found');

    const result = plan.reject(command);
    if (result.isFailure) return result;

    await this.repository.save(plan);
    return Result.ok();
  }

  async returnForCorrection(planId: PlanningId, command: ReturnForCorrectionCommand): Promise<Result<void>> {
    const plan = await this.repository.findById(planId);
    if (!plan) return Result.fail('Plan not found');

    const result = plan.returnForCorrection(command);
    if (result.isFailure) return result;

    await this.repository.save(plan);
    return Result.ok();
  }

  async amendPlan(planId: PlanningId, command: AmendPlanCommand): Promise<Result<void>> {
    const plan = await this.repository.findById(planId);
    if (!plan) return Result.fail('Plan not found');

    const result = plan.amend(command);
    if (result.isFailure) return result;

    await this.repository.save(plan);
    return Result.ok();
  }
}
