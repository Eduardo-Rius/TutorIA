import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/result/Result';
import { DomainError } from '../../../shared/errors/DomainError';

export type TenantState = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export class InvalidTenantStatusError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid TenantStatus: ${cause}`, 'INVALID_TENANT_STATUS');
  }
}

interface TenantStatusProps {
  value: TenantState;
}

export class TenantStatus extends ValueObject<TenantStatusProps> {
  private constructor(props: TenantStatusProps) {
    super(props);
  }

  public get value(): TenantState {
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

  public static active(): TenantStatus {
    return new TenantStatus({ value: 'ACTIVE' });
  }

  public static suspended(): TenantStatus {
    return new TenantStatus({ value: 'SUSPENDED' });
  }

  public static archived(): TenantStatus {
    return new TenantStatus({ value: 'ARCHIVED' });
  }

  public static restore(state: string): Result<TenantStatus, InvalidTenantStatusError> {
    if (state === 'ACTIVE') return Result.ok(TenantStatus.active());
    if (state === 'SUSPENDED') return Result.ok(TenantStatus.suspended());
    if (state === 'ARCHIVED') return Result.ok(TenantStatus.archived());

    return Result.fail(new InvalidTenantStatusError(`Unknown state '${state}'`));
  }
}
