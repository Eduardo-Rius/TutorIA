import { SystemClock } from '../../shared/kernel/Clock';
import { DomainEvent, EventMetadata } from '../../shared/events/DomainEvent';

export class PlanCreated extends DomainEvent {
  constructor(aggregateId: string, authorId: string) {
    super(
      crypto.randomUUID(), 'PlanCreated', '1.0', new SystemClock().now(), aggregateId, 'PedagogicalPlan',
      { timestamp: new SystemClock().now(), tenantId: 'system', actorId: authorId }
    );
  }
}

export class PlanReadyForReview extends DomainEvent {
  constructor(aggregateId: string, versionId: string, authorId: string) {
    super(
      crypto.randomUUID(), 'PlanReadyForReview', '1.0', new SystemClock().now(), aggregateId, 'PedagogicalPlan',
      { timestamp: new SystemClock().now(), tenantId: 'system', actorId: authorId, causationId: versionId }
    );
  }
}

export class PlanSubmittedForReview extends DomainEvent {
  constructor(aggregateId: string, centerId: string) {
    super(
      crypto.randomUUID(), 'PlanSubmittedForReview', '1.0', new SystemClock().now(), aggregateId, 'PedagogicalPlan',
      { timestamp: new SystemClock().now(), tenantId: 'system', causationId: centerId }
    );
  }
}

export class PlanningValidationFailed extends DomainEvent {
  constructor(aggregateId: string, reason: string) {
    super(
      crypto.randomUUID(), 'PlanningValidationFailed', '1.0', new SystemClock().now(), aggregateId, 'PedagogicalPlan',
      { timestamp: new SystemClock().now(), tenantId: 'system', causationId: reason }
    );
  }
}

export class PlanReturnedForCorrection extends DomainEvent {
  constructor(aggregateId: string, reviewerId: string, reason: string) {
    super(
      crypto.randomUUID(), 'PlanReturnedForCorrection', '1.0', new SystemClock().now(), aggregateId, 'PedagogicalPlan',
      { timestamp: new SystemClock().now(), tenantId: 'system', actorId: reviewerId, causationId: reason }
    );
  }
}

export class PlanRejected extends DomainEvent {
  constructor(aggregateId: string, reviewerId: string, reason: string) {
    super(
      crypto.randomUUID(), 'PlanRejected', '1.0', new SystemClock().now(), aggregateId, 'PedagogicalPlan',
      { timestamp: new SystemClock().now(), tenantId: 'system', actorId: reviewerId, causationId: reason }
    );
  }
}

export class PlanApproved extends DomainEvent {
  constructor(aggregateId: string, approverId: string) {
    super(
      crypto.randomUUID(), 'PlanApproved', '1.0', new SystemClock().now(), aggregateId, 'PedagogicalPlan',
      { timestamp: new SystemClock().now(), tenantId: 'system', actorId: approverId }
    );
  }
}

export class PlanAmended extends DomainEvent {
  constructor(aggregateId: string, newVersionId: string) {
    super(
      crypto.randomUUID(), 'PlanAmended', '1.0', new SystemClock().now(), aggregateId, 'PedagogicalPlan',
      { timestamp: new SystemClock().now(), tenantId: 'system', causationId: newVersionId }
    );
  }
}
