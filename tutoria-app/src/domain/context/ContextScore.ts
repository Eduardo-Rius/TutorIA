import { ValueObject } from '../../shared/kernel/ValueObject';

interface ContextScoreProps {
  coverage: number;
  freshness: number;
  authority: number;
  relevance: number;
}

export class ContextScore extends ValueObject<ContextScoreProps> {
  private constructor(props: ContextScoreProps) {
    super(props);
  }

  public static create(props: ContextScoreProps): ContextScore {
    for (const key of ['coverage', 'freshness', 'authority', 'relevance'] as const) {
      if (props[key] < 0 || props[key] > 100) {
        throw new Error(`${key} score must be between 0 and 100`);
      }
    }
    return new ContextScore(props);
  }

  get coverage(): number { return this.props.coverage; }
  get freshness(): number { return this.props.freshness; }
  get authority(): number { return this.props.authority; }
  get relevance(): number { return this.props.relevance; }
  
  public getOverallScore(): number {
    return (this.coverage + this.freshness + this.authority + this.relevance) / 4;
  }
}
