import { DomainError } from '../../../../shared/errors/DomainError';

export class InvalidCenterOperationError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid operation on Center: ${cause}`, 'INVALID_CENTER_OPERATION');
  }
}
