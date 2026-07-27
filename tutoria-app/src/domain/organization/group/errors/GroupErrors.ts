import { DomainError } from '../../../../shared/errors/DomainError';

export class InvalidGroupOperationError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid operation on Group: ${cause}`, 'INVALID_GROUP_OPERATION');
  }
}

export class InvalidGroupNameError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid GroupName: ${cause}`, 'INVALID_GROUP_NAME');
  }
}

export class InvalidGroupCodeError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid GroupCode: ${cause}`, 'INVALID_GROUP_CODE');
  }
}

export class InvalidGroupCapacityError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid GroupCapacity: ${cause}`, 'INVALID_GROUP_CAPACITY');
  }
}

export class InvalidDevelopmentStageError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid DevelopmentStage: ${cause}`, 'INVALID_DEVELOPMENT_STAGE');
  }
}

export class InvalidAcademicCycleError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid AcademicCycle: ${cause}`, 'INVALID_ACADEMIC_CYCLE');
  }
}

export class InvalidGroupStatusError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid GroupStatus: ${cause}`, 'INVALID_GROUP_STATUS');
  }
}
