import { describe, it, expect } from 'vitest';
import { SystemClock } from '../kernel/Clock';

describe('SystemClock', () => {
  it('should return a valid Date object', () => {
    const clock = new SystemClock();
    const now = clock.now();
    expect(now).toBeInstanceOf(Date);
    expect(now.getTime()).not.toBeNaN();
  });
});
