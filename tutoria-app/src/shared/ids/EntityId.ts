import { ValueObject } from '../kernel/ValueObject';

export abstract class EntityId extends ValueObject<string> {
  public toString(): string {
    return this.props;
  }
}
