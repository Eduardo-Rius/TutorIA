import { DomainEvent, EventMetadata } from '../../../../shared/events/DomainEvent';

export class GroupCreated extends DomainEvent {
  public constructor(
    eventId: string,
    aggregateId: string,
    tenantId: string,
    public readonly institutionId: string,
    public readonly centerId: string,
    public readonly name: string,
    public readonly code: string,
    public readonly stage: string,
    public readonly maxSeats: number,
    public readonly cycle: string,
    occurredOn: Date
  ) {
    const metadata: EventMetadata = {
      tenantId,
      timestamp: occurredOn
    };
    super(eventId, 'GroupCreated', '1.0', occurredOn, aggregateId, 'Group', metadata);
  }
}
