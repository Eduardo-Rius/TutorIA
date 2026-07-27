import { DomainError } from '../../../../shared/errors/DomainError';

export class InvalidInstitutionNameError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid InstitutionName: ${cause}`, 'INVALID_INSTITUTION_NAME');
  }
}
