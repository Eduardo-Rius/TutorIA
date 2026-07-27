import { ValueObject } from '../../../../shared/kernel/ValueObject';
import { Result } from '../../../../shared/result/Result';
import { InvalidDevelopmentStageError } from '../errors/GroupErrors';

export type Stage = 'INFANTS' | 'TODDLERS' | 'PRESCHOOL';

export class DevelopmentStage extends ValueObject<{ value: Stage }> {
  private constructor(props: { value: Stage }) {
    super(props);
  }

  public get value(): Stage {
    return this.props.value;
  }

  public static create(stage: string): Result<DevelopmentStage, InvalidDevelopmentStageError> {
    if (stage === 'INFANTS' || stage === 'TODDLERS' || stage === 'PRESCHOOL') {
      return Result.ok(new DevelopmentStage({ value: stage }));
    }
    return Result.fail(new InvalidDevelopmentStageError(`Unknown stage '${stage}'`));
  }
}
