import { DomainEvent, EventMetadata } from '../../../shared/events/DomainEvent';

export class TenantCreated extends DomainEvent {
  public constructor(
    aggregateId: string,
    public readonly name: string,
    occurredOn: Date
  ) {
    const metadata: EventMetadata = {
      tenantId: aggregateId, // The tenant is its own tenant for isolation purposes
      timestamp: occurredOn
    };
    super('TenantCreated', 'TenantCreated', '1.0', occurredOn, aggregateId, 'Tenant', metadata);
  }
}
