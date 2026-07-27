import { DomainEvent, EventMetadata } from '../../../../shared/events/DomainEvent';

export class AcademicCycleClosed extends DomainEvent {
  public constructor(
    eventId: string,
    aggregateId: string,
    tenantId: string,
    public readonly cycle: string,
    occurredOn: Date
  ) {
    const metadata: EventMetadata = {
      tenantId,
      timestamp: occurredOn
    };
    super(eventId, 'AcademicCycleClosed', '1.0', occurredOn, aggregateId, 'Group', metadata);
  }
}
