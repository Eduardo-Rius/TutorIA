import { DomainEvent, EventMetadata } from '../../../../shared/events/DomainEvent';

export class InstitutionArchived extends DomainEvent {
  public constructor(
    eventId: string,
    aggregateId: string,
    tenantId: string,
    occurredOn: Date
  ) {
    const metadata: EventMetadata = {
      tenantId,
      timestamp: occurredOn
    };
    super(eventId, 'InstitutionArchived', '1.0', occurredOn, aggregateId, 'Institution', metadata);
  }
}
