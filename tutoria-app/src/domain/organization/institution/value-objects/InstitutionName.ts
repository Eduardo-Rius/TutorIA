import { ValueObject } from '../../../../shared/kernel/ValueObject';
import { Result } from '../../../../shared/result/Result';
import { InvalidInstitutionNameError } from '../errors/InvalidInstitutionNameError';

export class InstitutionName extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  public static create(name: string): Result<InstitutionName, InvalidInstitutionNameError> {
    if (name === null || name === undefined) {
      return Result.fail(new InvalidInstitutionNameError('Name cannot be null or undefined'));
    }
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return Result.fail(new InvalidInstitutionNameError('Name cannot be empty'));
    }
    if (trimmed.length > 100) {
      return Result.fail(new InvalidInstitutionNameError('Name cannot exceed 100 characters'));
    }
    return Result.ok(new InstitutionName({ value: trimmed }));
  }
}
