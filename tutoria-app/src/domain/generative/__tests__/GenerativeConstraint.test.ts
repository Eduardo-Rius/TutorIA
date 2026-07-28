import { describe, it, expect } from 'vitest';
import { GenerativeConstraint } from '../GenerativeConstraint';

describe('GenerativeConstraint', () => {
  it('creates valid constraints', () => {
    const constraint: GenerativeConstraint = {
      type: 'MaxLength',
      value: '500',
      isStrict: true
    };
    expect(constraint.type).toBe('MaxLength');
    expect(constraint.isStrict).toBe(true);
  });
});
