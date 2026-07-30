import { ValueObject } from '../../../../shared/kernel/ValueObject';
import { Result } from '../../../../shared/result/Result';
import { DomainError } from '../../../../shared/errors/DomainError';

export type InstitutionState = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export class InvalidInstitutionStatusError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid InstitutionStatus: ${cause}`, 'INVALID_INSTITUTION_STATUS');
  }
}

export class InstitutionStatus extends ValueObject<{ value: InstitutionState }> {
  private constructor(props: { value: InstitutionState }) {
    super(props);
  }

  public get value(): InstitutionState {
    return this.props.value;
  }

  public isActive(): boolean {
    return this.props.value === 'ACTIVE';
  }

  public isSuspended(): boolean {
    return this.props.value === 'SUSPENDED';
  }

  public isArchived(): boolean {
    return this.props.value === 'ARCHIVED';
  }

  public static active(): InstitutionStatus {
    return new InstitutionStatus({ value: 'ACTIVE' });
  }

  public static suspended(): InstitutionStatus {
    return new InstitutionStatus({ value: 'SUSPENDED' });
  }

  public static archived(): InstitutionStatus {
    return new InstitutionStatus({ value: 'ARCHIVED' });
  }

  public static restore(state: string): Result<InstitutionStatus, InvalidInstitutionStatusError> {
    if (state === 'ACTIVE') return Result.ok(InstitutionStatus.active());
    if (state === 'SUSPENDED') return Result.ok(InstitutionStatus.suspended());
    if (state === 'ARCHIVED') return Result.ok(InstitutionStatus.archived());

    return Result.fail(new InvalidInstitutionStatusError(`Unknown state '${state}'`));
  }
}
