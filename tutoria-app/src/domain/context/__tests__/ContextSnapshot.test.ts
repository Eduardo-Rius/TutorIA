import { describe, it, expect } from 'vitest';
import { ContextSnapshot } from '../ContextSnapshot';
import { ContextComponent } from '../ContextComponent';
import { ContextScore } from '../ContextScore';
import { SystemClock } from '../../../shared/kernel/Clock';

describe('ContextSnapshot', () => {
  const score = ContextScore.create({ coverage: 100, freshness: 100, authority: 100, relevance: 100 });
  const timestamp = new Date(new SystemClock().now().getTime());

  it('assembles an empty snapshot', () => {
    const snap = new ContextSnapshot('s1', timestamp, [], [], score);
    expect(snap.components.length).toBe(0);
    expect(snap.fragments.length).toBe(0);
  });

  it('can query components safely', () => {
    const comp: ContextComponent<{ role: string }> = { type: 'Actor', value: { role: 'Teacher' }, source: 'System', capturedAt: timestamp };
    const snap = new ContextSnapshot('s1', timestamp, [comp], [], score);

    expect(snap.hasComponent('Actor')).toBe(true);
    expect(snap.hasComponent('Missing')).toBe(false);
    expect(snap.getComponent<{ role: string }>('Actor')?.value.role).toBe('Teacher');
    expect(snap.getComponent('Missing')).toBeUndefined();
  });

  it('collections are immutable', () => {
    const snap = new ContextSnapshot('s1', timestamp, [], [], score);
    expect(() => { // @ts-expect-error testing readonly
snap.components.push({}); }).toThrow();
    expect(() => { // @ts-expect-error testing readonly
snap.fragments.push({}); }).toThrow();
  });
});
