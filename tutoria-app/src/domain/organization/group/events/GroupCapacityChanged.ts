import { DomainEvent, EventMetadata } from '../../../../shared/events/DomainEvent';

export class GroupCapacityChanged extends DomainEvent {
  public constructor(
    eventId: string,
    aggregateId: string,
    tenantId: string,
    public readonly oldMaxSeats: number,
    public readonly newMaxSeats: number,
    public readonly oldOccupiedSeats: number,
    public readonly newOccupiedSeats: number,
    occurredOn: Date
  ) {
    const metadata: EventMetadata = {
      tenantId,
      timestamp: occurredOn
    };
    super(eventId, 'GroupCapacityChanged', '1.0', occurredOn, aggregateId, 'Group', metadata);
  }
}
