import { DomainEvent, EventMetadata } from '../../../../shared/events/DomainEvent';

export class CenterCreated extends DomainEvent {
  public constructor(
    eventId: string,
    aggregateId: string,
    tenantId: string,
    public readonly institutionId: string,
    public readonly name: string,
    public readonly code: string,
    occurredOn: Date
  ) {
    const metadata: EventMetadata = {
      tenantId,
      timestamp: occurredOn
    };
    super(eventId, 'CenterCreated', '1.0', occurredOn, aggregateId, 'Center', metadata);
  }
}
