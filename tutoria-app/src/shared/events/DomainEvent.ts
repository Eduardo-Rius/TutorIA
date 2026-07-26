export interface EventMetadata {
  readonly timestamp: Date;
  readonly tenantId: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly actorId?: string;
}

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly eventName: string;
  public readonly eventVersion: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly metadata: EventMetadata;

  protected constructor(
    eventId: string,
    eventName: string,
    eventVersion: string,
    occurredOn: Date,
    aggregateId: string,
    aggregateType: string,
    metadata: EventMetadata
  ) {
    this.eventId = eventId;
    this.eventName = eventName;
    this.eventVersion = eventVersion;
    this.occurredOn = occurredOn;
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.metadata = Object.freeze(metadata);
  }
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
