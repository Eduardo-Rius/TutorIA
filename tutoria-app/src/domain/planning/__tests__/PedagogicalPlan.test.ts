import { describe, it, expect } from 'vitest';
import { PedagogicalPlan } from '../PedagogicalPlan';
import { UserId, CenterId, GroupId } from '../../../shared/value-objects/Ids';
import { PlanStatus } from '../PlanStatus';
import { ApprovePlanCommand, RejectPlanCommand } from '../Commands';

describe('PedagogicalPlan Aggregate', () => {
  const authorId = UserId.restore('11111111-1111-4111-8111-111111111111');
  const approverId = UserId.restore('22222222-2222-4222-8222-222222222222');
  const centerId = CenterId.restore('33333333-3333-4333-8333-333333333333');
  const groupId = GroupId.restore('44444444-4444-4444-8444-444444444444');
  const cycleId = '2026-2027';

  it('should create a plan in DRAFT status', () => {
    const plan = PedagogicalPlan.create(authorId, centerId, groupId, cycleId, new Date(), new Date());
    expect(plan.status).toBe(PlanStatus.DRAFT);
    expect(plan.authorId?.equals(authorId)).toBe(true);
  });

  it('should transition to READY_FOR_REVIEW', () => {
    const plan = PedagogicalPlan.create(authorId, centerId, groupId, cycleId, new Date(), new Date());
    const result = plan.readyForReview(authorId);
    expect(result.isSuccess).toBe(true);
    expect(plan.status).toBe(PlanStatus.READY_FOR_REVIEW);
  });

  it('should fail readyForReview if called by someone else', () => {
    const plan = PedagogicalPlan.create(authorId, centerId, groupId, cycleId, new Date(), new Date());
    const result = plan.readyForReview(approverId);
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/Only the author can/);
  });

  it('should enforce Separation of Duties (SoD) during approval', () => {
    const plan = PedagogicalPlan.create(authorId, centerId, groupId, cycleId, new Date(), new Date());
    plan.readyForReview(authorId);
    plan.submitForReview();
    expect(plan.status).toBe(PlanStatus.UNDER_REVIEW);

    const approveCommand: ApprovePlanCommand = {
      approverId: authorId, // Author trying to approve their own plan
      contextId: centerId,
      normativeVersion: '1.0',
      curriculumVersion: '1.0',
      templateVersion: '1.0'
    };

    const result = plan.approve(approveCommand);
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/Separation of Duties/);
  });

  it('should allow a different user to approve', () => {
    const plan = PedagogicalPlan.create(authorId, centerId, groupId, cycleId, new Date(), new Date());
    plan.readyForReview(authorId);
    plan.submitForReview();

    const approveCommand: ApprovePlanCommand = {
      approverId: approverId,
      contextId: centerId,
      normativeVersion: '1.0',
      curriculumVersion: '1.0',
      templateVersion: '1.0'
    };

    const result = plan.approve(approveCommand);
    expect(result.isSuccess).toBe(true);
    expect(plan.status).toBe(PlanStatus.APPROVED);
    expect(plan.approvalSignature).toBeDefined();
    expect(plan.snapshot).toBeDefined();
  });

  it('should enforce Separation of Duties (SoD) during rejection', () => {
    const plan = PedagogicalPlan.create(authorId, centerId, groupId, cycleId, new Date(), new Date());
    plan.readyForReview(authorId);
    plan.submitForReview();

    const rejectCommand: RejectPlanCommand = {
      approverId: authorId, // Author trying to reject
      reason: 'Missing something'
    };

    const result = plan.reject(rejectCommand);
    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/Author cannot reject/);
  });
});
