import { ValueObject } from '../../../../shared/kernel/ValueObject';
import { Result } from '../../../../shared/result/Result';

export type ProvisionModalityType = 'DIRECT' | 'INDIRECT';

export interface ProvisionModalityProps {
  value: ProvisionModalityType;
}

export class ProvisionModality extends ValueObject<ProvisionModalityProps> {
  private constructor(props: ProvisionModalityProps) {
    super(props);
  }

  public get value(): ProvisionModalityType {
    return this.props.value;
  }

  public isDirect(): boolean {
    return this.props.value === 'DIRECT';
  }

  public isIndirect(): boolean {
    return this.props.value === 'INDIRECT';
  }

  public static create(value: string): Result<ProvisionModality> {
    if (value !== 'DIRECT' && value !== 'INDIRECT') {
      return Result.fail('Invalid provision modality. Must be DIRECT or INDIRECT.');
    }
    return Result.ok(new ProvisionModality({ value: value as ProvisionModalityType }));
  }
}
