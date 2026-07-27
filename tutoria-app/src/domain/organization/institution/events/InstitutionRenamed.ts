import { DomainEvent, EventMetadata } from '../../../../shared/events/DomainEvent';

export class InstitutionRenamed extends DomainEvent {
  public constructor(
    eventId: string,
    aggregateId: string,
    tenantId: string,
    public readonly oldName: string,
    public readonly newName: string,
    occurredOn: Date
  ) {
    const metadata: EventMetadata = {
      tenantId,
      timestamp: occurredOn
    };
    super(eventId, 'InstitutionRenamed', '1.0', occurredOn, aggregateId, 'Institution', metadata);
  }
}
