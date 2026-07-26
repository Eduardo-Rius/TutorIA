import { DomainError } from './DomainError';

export class InvalidEntityIdError extends DomainError {
  public constructor(entityType: string, cause: string) {
    super(`Invalid ID for ${entityType}: ${cause}`, 'INVALID_ENTITY_ID');
  }
}
