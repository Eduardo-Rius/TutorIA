import { ValueObject } from '../kernel/ValueObject';

export abstract class EntityId extends ValueObject<string> {
  protected constructor(id: string) {
    super(id);
  }

  public toString(): string {
    return this.props;
  }

  protected static validateUUID(id: string): boolean {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(id);
  }
}
