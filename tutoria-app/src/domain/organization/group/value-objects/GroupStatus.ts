import { ValueObject } from '../../../../shared/kernel/ValueObject';
import { Result } from '../../../../shared/result/Result';
import { InvalidGroupStatusError } from '../errors/GroupErrors';

export type GroupState = 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'ARCHIVED';

export class GroupStatus extends ValueObject<{ value: GroupState }> {
  private constructor(props: { value: GroupState }) {
    super(props);
  }

  public get value(): GroupState {
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

  public static active(): GroupStatus {
    return new GroupStatus({ value: 'ACTIVE' });
  }

  public static suspended(): GroupStatus {
    return new GroupStatus({ value: 'SUSPENDED' });
  }

  public static closed(): GroupStatus {
    return new GroupStatus({ value: 'CLOSED' });
  }

  public static archived(): GroupStatus {
    return new GroupStatus({ value: 'ARCHIVED' });
  }

  public static restore(state: string): Result<GroupStatus, InvalidGroupStatusError> {
    if (state === 'ACTIVE') return Result.ok(GroupStatus.active());
    if (state === 'SUSPENDED') return Result.ok(GroupStatus.suspended());
    if (state === 'CLOSED') return Result.ok(GroupStatus.closed());
    if (state === 'ARCHIVED') return Result.ok(GroupStatus.archived());
    
    return Result.fail(new InvalidGroupStatusError(`Unknown state '${state}'`));
  }
}
