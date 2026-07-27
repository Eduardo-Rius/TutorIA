import { describe, it, expect } from 'vitest';
import { tokens } from '../tokens';

describe('Theme Tokens', () => {
  it('should export all required token categories', () => {
    expect(tokens.colors).toBeDefined();
    expect(tokens.typography).toBeDefined();
    expect(tokens.spacing).toBeDefined();
    expect(tokens.radius).toBeDefined();
    expect(tokens.shadows).toBeDefined();
  });

  it('should not contain any PENDING_REVIEW values', () => {
    const checkNoPendingReview = (obj: Record<string, unknown>) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          expect(obj[key]).not.toBe('PENDING_REVIEW');
        } else if (typeof obj[key] === 'object') {
          checkNoPendingReview(obj[key] as Record<string, unknown>);
        }
      }
    };
    checkNoPendingReview(tokens);
  });

  it('should not contain empty invalid string values', () => {
    const checkNoEmptyValues = (obj: Record<string, unknown>) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          expect(obj[key].trim()).not.toBe('');
        } else if (typeof obj[key] === 'object') {
          checkNoEmptyValues(obj[key] as Record<string, unknown>);
        }
      }
    };
    checkNoEmptyValues(tokens);
  });
});
