import { DomainEvent, EventMetadata } from '../../../../shared/events/DomainEvent';

export class InstitutionCreated extends DomainEvent {
  public constructor(
    eventId: string,
    aggregateId: string,
    tenantId: string,
    public readonly name: string,
    public readonly code: string,
    occurredOn: Date
  ) {
    const metadata: EventMetadata = {
      tenantId,
      timestamp: occurredOn
    };
    super(eventId, 'InstitutionCreated', '1.0', occurredOn, aggregateId, 'Institution', metadata);
  }
}
