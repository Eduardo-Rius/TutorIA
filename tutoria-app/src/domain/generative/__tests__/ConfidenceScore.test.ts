import { describe, it, expect } from 'vitest';
import { ConfidenceScore } from '../ConfidenceScore';

describe('ConfidenceScore', () => {
  it('creates correctly and assesses High level', () => {
    const score = ConfidenceScore.create('High');
    expect(score.isReliable()).toBe(true);
    expect(score.isLowConfidence()).toBe(false);
    expect(score.requiresHumanReview()).toBe(false);
  });

  it('creates correctly and assesses Low level', () => {
    const score = ConfidenceScore.create('Low');
    expect(score.isReliable()).toBe(false);
    expect(score.isLowConfidence()).toBe(true);
    expect(score.requiresHumanReview()).toBe(true);
  });
  
  it('creates correctly and assesses Medium level', () => {
    const score = ConfidenceScore.create('Medium');
    expect(score.isReliable()).toBe(false);
    expect(score.isLowConfidence()).toBe(false);
    expect(score.requiresHumanReview()).toBe(true);
  });
});
