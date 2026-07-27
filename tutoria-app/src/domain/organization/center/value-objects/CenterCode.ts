import { ValueObject } from '../../../../shared/kernel/ValueObject';
import { Result } from '../../../../shared/result/Result';
import { InvalidCenterCodeError } from '../errors/InvalidCenterCodeError';

export class CenterCode extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  public static create(code: string): Result<CenterCode, InvalidCenterCodeError> {
    if (code === null || code === undefined) {
      return Result.fail(new InvalidCenterCodeError('Code cannot be null or undefined'));
    }
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 0) {
      return Result.fail(new InvalidCenterCodeError('Code cannot be empty'));
    }
    if (trimmed.length > 20) {
      return Result.fail(new InvalidCenterCodeError('Code cannot exceed 20 characters'));
    }
    if (!/^[A-Z0-9-]+$/.test(trimmed)) {
      return Result.fail(new InvalidCenterCodeError('Code must contain only uppercase letters, numbers and hyphens'));
    }
    return Result.ok(new CenterCode({ value: trimmed }));
  }
}
