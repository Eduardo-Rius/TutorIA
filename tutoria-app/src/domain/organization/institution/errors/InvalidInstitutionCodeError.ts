import { DomainError } from '../../../../shared/errors/DomainError';

export class InvalidInstitutionCodeError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid InstitutionCode: ${cause}`, 'INVALID_INSTITUTION_CODE');
  }
}
