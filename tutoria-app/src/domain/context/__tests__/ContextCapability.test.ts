import { describe, it, expect } from 'vitest';
import { ContextCapability } from '../ContextCapability';
import { ContextRequirement } from '../ContextRequirement';

describe('ContextCapability', () => {
  it('can declare empty requirements', () => {
    const cap: ContextCapability = {
      name: 'EmptyCap',
      getRequirements: () => []
    };
    expect(cap.getRequirements().length).toBe(0);
  });

  it('can declare multiple requirements', () => {
    const req1: ContextRequirement = { id: '1', axis: 'A', description: 'desc', parameters: {}, isRequired: true };
    const req2: ContextRequirement = { id: '2', axis: 'B', description: 'desc', parameters: {}, isRequired: false };
    const cap: ContextCapability = {
      name: 'MultiCap',
      getRequirements: () => [req1, req2]
    };
    expect(cap.getRequirements().length).toBe(2);
  });
});
