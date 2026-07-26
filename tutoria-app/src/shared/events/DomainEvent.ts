export interface EventMetadata {
  readonly timestamp: Date;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly actorId?: string;
}

export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly eventName: string;
  public readonly metadata?: EventMetadata | undefined;

  protected constructor(metadata?: EventMetadata) {
    this.occurredOn = new Date();
    this.eventName = this.constructor.name;
    this.metadata = metadata;
  }
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
