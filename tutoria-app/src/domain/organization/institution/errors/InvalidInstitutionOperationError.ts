import { DomainError } from '../../../../shared/errors/DomainError';

export class InvalidInstitutionOperationError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid operation on Institution: ${cause}`, 'INVALID_INSTITUTION_OPERATION');
  }
}
