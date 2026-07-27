import { DomainEvent, EventMetadata } from '../../../shared/events/DomainEvent';

export class TenantRenamed extends DomainEvent {
  public constructor(
    aggregateId: string,
    public readonly oldName: string,
    public readonly newName: string,
    occurredOn: Date
  ) {
    const metadata: EventMetadata = {
      tenantId: aggregateId,
      timestamp: occurredOn
    };
    super('TenantRenamed', 'TenantRenamed', '1.0', occurredOn, aggregateId, 'Tenant', metadata);
  }
}
