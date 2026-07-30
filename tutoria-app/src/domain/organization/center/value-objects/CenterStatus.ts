import { ValueObject } from '../../../../shared/kernel/ValueObject';
import { Result } from '../../../../shared/result/Result';
import { DomainError } from '../../../../shared/errors/DomainError';

export type CenterState = 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'ARCHIVED';

export class InvalidCenterStatusError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid CenterStatus: ${cause}`, 'INVALID_CENTER_STATUS');
  }
}

export class CenterStatus extends ValueObject<{ value: CenterState }> {
  private constructor(props: { value: CenterState }) {
    super(props);
  }

  public get value(): CenterState {
    return this.props.value;
  }

  public isActive(): boolean {
    return this.props.value === 'ACTIVE';
  }

  public isSuspended(): boolean {
    return this.props.value === 'SUSPENDED';
  }

  public isClosed(): boolean {
    return this.props.value === 'CLOSED';
  }

  public isArchived(): boolean {
    return this.props.value === 'ARCHIVED';
  }

  public static active(): CenterStatus {
    return new CenterStatus({ value: 'ACTIVE' });
  }

  public static suspended(): CenterStatus {
    return new CenterStatus({ value: 'SUSPENDED' });
  }

  public static closed(): CenterStatus {
    return new CenterStatus({ value: 'CLOSED' });
  }

  public static archived(): CenterStatus {
    return new CenterStatus({ value: 'ARCHIVED' });
  }

  public static restore(state: string): Result<CenterStatus, InvalidCenterStatusError> {
    if (state === 'ACTIVE') return Result.ok(CenterStatus.active());
    if (state === 'SUSPENDED') return Result.ok(CenterStatus.suspended());
    if (state === 'CLOSED') return Result.ok(CenterStatus.closed());
    if (state === 'ARCHIVED') return Result.ok(CenterStatus.archived());

    return Result.fail(new InvalidCenterStatusError(`Unknown state '${state}'`));
  }
}
