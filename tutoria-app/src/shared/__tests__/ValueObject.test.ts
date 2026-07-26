import { describe, it, expect } from 'vitest';
import { ValueObject } from '../kernel/ValueObject';

class TestVO extends ValueObject<{ a: number; b: string }> {
  public constructor(props: { a: number; b: string }) {
    super(props);
  }
}

describe('ValueObject', () => {
  it('should return true for identical props', () => {
    const vo1 = new TestVO({ a: 1, b: 'test' });
    const vo2 = new TestVO({ a: 1, b: 'test' });
    expect(vo1.equals(vo2)).toBe(true);
  });

  it('should return false for different props', () => {
    const vo1 = new TestVO({ a: 1, b: 'test' });
    const vo2 = new TestVO({ a: 2, b: 'test' });
    expect(vo1.equals(vo2)).toBe(false);
  });

  it('props should be immutable (freeze)', () => {
    const vo = new TestVO({ a: 1, b: 'test' });
    expect(Object.isFrozen(vo.props)).toBe(true);
    const success = Reflect.set(vo.props, 'a', 2);
    expect(success).toBe(false);
  });
});
