import { ValueObject } from '../../../../shared/kernel/ValueObject';
import { Result } from '../../../../shared/result/Result';
import { InvalidAcademicCycleError } from '../errors/GroupErrors';

export class AcademicCycle extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  public get value(): string {
    return this.props.value;
  }

  public static create(cycle: string): Result<AcademicCycle, InvalidAcademicCycleError> {
    if (!cycle) {
      return Result.fail(new InvalidAcademicCycleError('Academic cycle cannot be empty'));
    }
    const trimmed = cycle.trim();
    if (!/^\d{4}-\d{4}$/.test(trimmed)) {
      return Result.fail(new InvalidAcademicCycleError('Academic cycle must follow YYYY-YYYY format (e.g. 2026-2027)'));
    }
    const [start, end] = trimmed.split('-').map(Number) as [number, number];
    if (end !== start + 1) {
      return Result.fail(new InvalidAcademicCycleError('Academic cycle years must be consecutive'));
    }

    return Result.ok(new AcademicCycle({ value: trimmed }));
  }
}
