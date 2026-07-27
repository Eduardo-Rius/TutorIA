import { DomainEvent, EventMetadata } from '../../../../shared/events/DomainEvent';

export class GroupRenamed extends DomainEvent {
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
    super(eventId, 'GroupRenamed', '1.0', occurredOn, aggregateId, 'Group', metadata);
  }
}
