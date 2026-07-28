import { ValueObject } from '../../shared/kernel/ValueObject';

interface PolicyCodeProps {
  value: string;
}

export class PolicyCode extends ValueObject<PolicyCodeProps> {
  private constructor(props: PolicyCodeProps) {
    super(props);
  }

  public static create(value: string): PolicyCode {
    if (!value || value.trim().length === 0) {
      throw new Error('Policy code cannot be empty');
    }
    // Example validation: must match format XXX-000
    if (!/^[a-zA-Z]{3,4}-\d{3}$/.test(value)) {
      throw new Error(`Invalid policy code format: ${value}`);
    }
    return new PolicyCode({ value: value.toUpperCase() });
  }

  get value(): string {
    return this.props.value;
  }
}
