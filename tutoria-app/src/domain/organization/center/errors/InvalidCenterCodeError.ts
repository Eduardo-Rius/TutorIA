import { DomainError } from '../../../../shared/errors/DomainError';

export class InvalidCenterCodeError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid CenterCode: ${cause}`, 'INVALID_CENTER_CODE');
  }
}
