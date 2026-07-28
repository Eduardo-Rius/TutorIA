import { describe, it, expect } from 'vitest';
import { PromptComposer } from '../PromptComposer';
import { InferenceProfile } from '../../../domain/generative/InferenceProfile';
import { ContextSnapshot } from '../../../domain/context/ContextSnapshot';
import { ContextScore } from '../../../domain/context/ContextScore';
import { GenerativeCapability } from '../../../domain/generative/GenerativeCapability';
import { SystemClock } from '../../../shared/kernel/Clock';

describe('PromptComposer', () => {
  it('composes an InferenceRequest correctly', () => {
    const composer = new PromptComposer();
    const timestamp = new Date(new SystemClock().now().getTime());
    const score = ContextScore.create({ coverage: 100, freshness: 100, authority: 100, relevance: 100 });
    const snap = new ContextSnapshot('s1', timestamp, [], [], score);
    
    const cap: GenerativeCapability = {
      name: 'TestCap',
      description: 'Test',
      getConstraints: () => [{ type: 'Tone', value: 'Formal', isStrict: true }]
    };

    const req = composer.compose(cap, snap, InferenceProfile.Pedagogical, 'JSON Output');

    expect(req.profile).toBe(InferenceProfile.Pedagogical);
    expect(req.expectedOutput).toBe('JSON Output');
    expect(req.constraints.length).toBe(1);
    expect(req.contextPayload).toContain('fragments');
  });
});
