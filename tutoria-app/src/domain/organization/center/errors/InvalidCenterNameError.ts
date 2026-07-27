import { DomainError } from '../../../../shared/errors/DomainError';

export class InvalidCenterNameError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid CenterName: ${cause}`, 'INVALID_CENTER_NAME');
  }
}
