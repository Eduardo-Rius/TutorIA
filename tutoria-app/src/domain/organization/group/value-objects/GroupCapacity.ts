import { ValueObject } from '../../../../shared/kernel/ValueObject';
import { Result } from '../../../../shared/result/Result';
import { InvalidGroupCapacityError } from '../errors/GroupErrors';

export class GroupCapacity extends ValueObject<{ maxSeats: number; occupiedSeats: number }> {
  private constructor(props: { maxSeats: number; occupiedSeats: number }) {
    super(props);
  }

  public get maxSeats(): number {
    return this.props.maxSeats;
  }

  public get occupiedSeats(): number {
    return this.props.occupiedSeats;
  }

  public static create(maxSeats: number, occupiedSeats: number = 0): Result<GroupCapacity, InvalidGroupCapacityError> {
    if (maxSeats < 0 || !Number.isInteger(maxSeats)) {
      return Result.fail(new InvalidGroupCapacityError('maxSeats must be a non-negative integer'));
    }
    if (occupiedSeats < 0 || !Number.isInteger(occupiedSeats)) {
      return Result.fail(new InvalidGroupCapacityError('occupiedSeats must be a non-negative integer'));
    }
    if (occupiedSeats > maxSeats) {
      return Result.fail(new InvalidGroupCapacityError(`occupiedSeats (${occupiedSeats}) cannot exceed maxSeats (${maxSeats})`));
    }

    return Result.ok(new GroupCapacity({ maxSeats, occupiedSeats }));
  }
}
