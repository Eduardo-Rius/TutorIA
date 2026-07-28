import { describe, it, expect } from 'vitest';
import { ContextScore } from '../ContextScore';

describe('ContextScore', () => {
  it('creates successfully with valid props', () => {
    const score = ContextScore.create({ coverage: 90, freshness: 100, authority: 80, relevance: 95 });
    expect(score.coverage).toBe(90);
    expect(score.getOverallScore()).toBe(91.25);
  });

  it('throws if a score is out of bounds (greater than 100)', () => {
    expect(() => ContextScore.create({ coverage: 101, freshness: 100, authority: 80, relevance: 95 }))
      .toThrow('coverage score must be between 0 and 100');
  });
  
  it('throws if a score is out of bounds (less than 0)', () => {
    expect(() => ContextScore.create({ coverage: 90, freshness: -1, authority: 80, relevance: 95 }))
      .toThrow('freshness score must be between 0 and 100');
  });
});
