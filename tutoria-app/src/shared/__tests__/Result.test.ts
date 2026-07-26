import { describe, it, expect } from 'vitest';
import { Result } from '../result/Result';

describe('Result', () => {
  it('should accept falsy values like false, 0, "" on success', () => {
    const resFalse = Result.ok(false);
    expect(resFalse.isSuccess).toBe(true);
    expect(resFalse.getValue()).toBe(false);

    const resZero = Result.ok(0);
    expect(resZero.isSuccess).toBe(true);
    expect(resZero.getValue()).toBe(0);

    const resEmptyString = Result.ok("");
    expect(resEmptyString.isSuccess).toBe(true);
    expect(resEmptyString.getValue()).toBe("");
  });

  it('should support Result<void>', () => {
    const resVoid = Result.ok();
    expect(resVoid.isSuccess).toBe(true);
    expect(resVoid.getValue()).toBeNull();
  });

  it('should fail with an error', () => {
    const resFail = Result.fail("Error Message");
    expect(resFail.isFailure).toBe(true);
    expect(resFail.error).toBe("Error Message");
    expect(() => resFail.getValue()).toThrowError();
  });
});
