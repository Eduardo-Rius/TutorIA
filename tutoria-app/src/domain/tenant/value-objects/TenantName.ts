import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/result/Result';
import { DomainError } from '../../../shared/errors/DomainError';

export class InvalidTenantNameError extends DomainError {
  public constructor(cause: string) {
    super(`Invalid TenantName: ${cause}`, 'INVALID_TENANT_NAME');
  }
}

interface TenantNameProps {
  value: string;
}

export class TenantName extends ValueObject<TenantNameProps> {
  private constructor(props: TenantNameProps) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  public static create(name: string): Result<TenantName, InvalidTenantNameError> {
    if (name === null || name === undefined) {
      return Result.fail(new InvalidTenantNameError('Name cannot be null or undefined'));
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return Result.fail(new InvalidTenantNameError('Name cannot be empty'));
    }
    if (trimmed.length > 100) {
      return Result.fail(new InvalidTenantNameError('Name cannot exceed 100 characters'));
    }

    return Result.ok(new TenantName({ value: trimmed }));
  }
}
