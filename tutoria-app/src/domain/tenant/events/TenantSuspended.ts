import { DomainEvent, EventMetadata } from '../../../shared/events/DomainEvent';

export class TenantSuspended extends DomainEvent {
  public constructor(
    aggregateId: string,
    occurredOn: Date
  ) {
    const metadata: EventMetadata = {
      tenantId: aggregateId,
      timestamp: occurredOn
    };
    super('TenantSuspended', 'TenantSuspended', '1.0', occurredOn, aggregateId, 'Tenant', metadata);
  }
}
