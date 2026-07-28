import { describe, it, expect } from 'vitest';
import { PolicyCode } from '../PolicyCode';

describe('PolicyCode', () => {
  it('creates valid code', () => {
    const code = PolicyCode.create('PLN-001');
    expect(code.value).toBe('PLN-001');
  });

  it('normalizes to uppercase', () => {
    const code = PolicyCode.create('pln-001');
    expect(code.value).toBe('PLN-001');
  });

  it('throws on empty', () => {
    expect(() => PolicyCode.create('')).toThrow('Policy code cannot be empty');
  });

  it('throws on invalid format', () => {
    expect(() => PolicyCode.create('INVALID')).toThrow('Invalid policy code format: INVALID');
  });
});
