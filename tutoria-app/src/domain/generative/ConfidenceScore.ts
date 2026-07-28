import { ValueObject } from '../../shared/kernel/ValueObject';

export type ConfidenceLevel = 'VeryLow' | 'Low' | 'Medium' | 'High' | 'VeryHigh';

interface ConfidenceScoreProps {
  level: ConfidenceLevel;
}

export class ConfidenceScore extends ValueObject<ConfidenceScoreProps> {
  private constructor(props: ConfidenceScoreProps) {
    super(props);
  }

  public static create(level: ConfidenceLevel): ConfidenceScore {
    return new ConfidenceScore({ level });
  }

  get level(): ConfidenceLevel {
    return this.props.level;
  }

  public isReliable(): boolean {
    return this.level === 'High' || this.level === 'VeryHigh';
  }

  public isLowConfidence(): boolean {
    return this.level === 'VeryLow' || this.level === 'Low';
  }

  public requiresHumanReview(): boolean {
    return !this.isReliable();
  }
}
