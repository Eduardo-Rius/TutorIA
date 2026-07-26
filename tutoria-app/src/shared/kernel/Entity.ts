import { EntityId } from '../ids/EntityId';

export abstract class Entity<TId extends EntityId> {
  public readonly id: TId;

  protected constructor(id: TId) {
    this.id = id;
  }

  public equals(object?: Entity<TId>): boolean {
    if (object == null || object == undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!(object instanceof Entity)) {
      return false;
    }

    return this.id.equals(object.id);
  }
}
