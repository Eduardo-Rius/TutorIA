import { describe, it, expect } from 'vitest';
import { ContextRequirement } from '../ContextRequirement';

describe('ContextRequirement', () => {
  it('creates valid requirement', () => {
    const req: ContextRequirement = {
      id: 'req-1',
      axis: 'Normative',
      description: 'Test',
      parameters: Object.freeze({}),
      isRequired: true
    };
    expect(req.id).toBe('req-1');
  });

  it('maintains immutability of parameters', () => {
    const req: ContextRequirement = {
      id: 'req-1',
      axis: 'Normative',
      description: 'Test',
      parameters: Object.freeze({ key: 'val' }),
      isRequired: true
    };
    expect(() => { // @ts-expect-error testing readonly
req.parameters.key = 'new_val'; }).toThrow();
  });
});
