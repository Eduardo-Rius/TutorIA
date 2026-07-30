import { describe, it, expect } from 'vitest';
import { ContextAssembler } from '../ContextAssembler';
import { ContextRequirement } from '../ContextRequirement';
import { ContextFragment } from '../ContextFragment';
import { ContextComponent } from '../ContextComponent';
import { SystemClock } from '../../../shared/kernel/Clock';

describe('ContextAssembler', () => {
  const timestamp = new Date(new SystemClock().now().getTime());

  it('consolidates and calculates score properly', () => {
    const assembler = new ContextAssembler();
    const reqs: ContextRequirement[] = [
      { id: 'r1', axis: 'A', description: 'req', parameters: {}, isRequired: true }
    ];
    const comps: ContextComponent[] = [
      { type: 'planning', value: { status: 'draft' }, source: 'DB', capturedAt: timestamp }
    ];
    const frags: ContextFragment[] = [
      { id: 'f1', type: 'rule', source: 'SEP', content: 'test', relevance: 80, metadata: {} }
    ];

    const snap = assembler.assemble('s1', reqs, comps, frags, timestamp);

    expect(snap.hasComponent('planning')).toBe(true);
    expect(snap.fragments.length).toBe(1);
    expect(snap.score.coverage).toBe(100);
    expect(snap.score.relevance).toBe(80); // Inherited from the single fragment
  });

  it('deduplicates fragments and components', () => {
    const assembler = new ContextAssembler();

    const comps: ContextComponent[] = [
      { type: 'planning', value: { id: 1 }, source: 'DB', capturedAt: timestamp },
      { type: 'planning', value: { id: 2 }, source: 'DB2', capturedAt: timestamp }
    ];
    const frags: ContextFragment[] = [
      { id: 'f1', type: 'rule', source: 'SEP', content: 'test', relevance: 80, metadata: {} },
      { id: 'f1', type: 'rule2', source: 'SEP', content: 'test2', relevance: 50, metadata: {} } // Same ID
    ];

    const snap = assembler.assemble('s1', [], comps, frags, timestamp);

    expect(snap.components.length).toBe(1);
    expect(snap.getComponent('planning')!.value).toEqual({ id: 2 }); // Last one wins in our simple map deduplication
    expect(snap.fragments.length).toBe(1);
    expect(snap.fragments[0]!.relevance).toBe(50);
  });

  it('handles missing required components correctly', () => {
    const assembler = new ContextAssembler();
    const reqs: ContextRequirement[] = [
      { id: 'r1', axis: 'A', description: 'req', parameters: {}, isRequired: true }
    ];
    // Providing zero fragments
    const snap = assembler.assemble('s1', reqs, [], [], timestamp);

    expect(snap.score.coverage).toBe(0); // 0 fragments for 1 requirement
  });
});
