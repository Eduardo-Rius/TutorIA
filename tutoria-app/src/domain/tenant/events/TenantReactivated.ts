import { DomainEvent, EventMetadata } from '../../../shared/events/DomainEvent';

export class TenantReactivated extends DomainEvent {
  public constructor(
    aggregateId: string,
    occurredOn: Date
  ) {
    const metadata: EventMetadata = {
      tenantId: aggregateId,
      timestamp: occurredOn
    };
    super('TenantReactivated', 'TenantReactivated', '1.0', occurredOn, aggregateId, 'Tenant', metadata);
  }
}
