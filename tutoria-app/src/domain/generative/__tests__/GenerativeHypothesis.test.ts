import { describe, it, expect } from 'vitest';
import { GenerativeHypothesis } from '../GenerativeHypothesis';
import { ConfidenceScore } from '../ConfidenceScore';
import { EvidenceSourceType } from '../EvidenceSourceType';
import { SystemClock } from '../../../shared/kernel/Clock';

describe('GenerativeHypothesis', () => {
  it('creates immutable arrays', () => {
    const capability = { name: 'Cap', description: 'Desc', getConstraints: () => [] };
    const score = ConfidenceScore.create('High');
    const timestamp = new Date(new SystemClock().now().getTime());

    const hypothesis = new GenerativeHypothesis(
      'id-1',
      capability,
      timestamp,
      'This is a hypothesis',
      score,
      ['limitation 1'],
      ['assumption 1'],
      ['alternative 1'],
      [{ sourceType: EvidenceSourceType.InstitutionalPolicy, sourceId: 'doc-1', relevance: 100, confidence: score }],
      ['warning 1'],
      { executionTimeMs: 1500, schemaVersion: '1.0', providerId: 'prov' }
    );

    expect(hypothesis.id).toBe('id-1');
    expect(hypothesis.hypothesis).toBe('This is a hypothesis');

    // Test immutability
    expect(() => { // @ts-expect-error testing readonly
      hypothesis.limitations.push('new limitation');
    }).toThrow();

    expect(() => { // @ts-expect-error testing readonly
      hypothesis.assumptions.push('new assumption');
    }).toThrow();
  });
});
