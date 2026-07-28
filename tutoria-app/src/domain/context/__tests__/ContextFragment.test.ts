import { describe, it, expect } from 'vitest';
import { ContextFragment } from '../ContextFragment';

describe('ContextFragment', () => {
  it('creates valid fragment with dates', () => {
    const frag: ContextFragment = {
      id: 'f1',
      type: 'rule',
      source: 'SEP',
      content: 'Rule text',
      relevance: 90,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2024-12-31'),
      metadata: Object.freeze({ tag: 'official' })
    };
    expect(frag.source).toBe('SEP');
  });

  it('metadata is immutable', () => {
    const frag: ContextFragment = {
      id: 'f1',
      type: 'rule',
      source: 'SEP',
      content: 'Rule text',
      relevance: 90,
      metadata: Object.freeze({ tag: 'official' })
    };
    expect(() => { // @ts-expect-error testing readonly
frag.metadata.tag = 'fake'; }).toThrow();
  });
});
