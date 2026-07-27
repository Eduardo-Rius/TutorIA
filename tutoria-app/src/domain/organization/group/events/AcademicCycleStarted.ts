import { DomainEvent, EventMetadata } from '../../../../shared/events/DomainEvent';

export class AcademicCycleStarted extends DomainEvent {
  public constructor(
    eventId: string,
    aggregateId: string,
    tenantId: string,
    public readonly newCycle: string,
    occurredOn: Date
  ) {
    const metadata: EventMetadata = {
      tenantId,
      timestamp: occurredOn
    };
    super(eventId, 'AcademicCycleStarted', '1.0', occurredOn, aggregateId, 'Group', metadata);
  }
}
