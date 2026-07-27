import { ValueObject } from '../../../../shared/kernel/ValueObject';
import { Result } from '../../../../shared/result/Result';
import { InvalidCenterNameError } from '../errors/InvalidCenterNameError';

export class CenterName extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  public static create(name: string): Result<CenterName, InvalidCenterNameError> {
    if (name === null || name === undefined) {
      return Result.fail(new InvalidCenterNameError('Name cannot be null or undefined'));
    }
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return Result.fail(new InvalidCenterNameError('Name cannot be empty'));
    }
    if (trimmed.length > 100) {
      return Result.fail(new InvalidCenterNameError('Name cannot exceed 100 characters'));
    }
    return Result.ok(new CenterName({ value: trimmed }));
  }
}
