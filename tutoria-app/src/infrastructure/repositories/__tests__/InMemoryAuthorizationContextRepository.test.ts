import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAuthorizationContextRepository } from '../InMemoryAuthorizationContextRepository';
import { AuthorizationContext } from '../../../domain/identity/authorization/AuthorizationContext';
import { Assignment } from '../../../domain/identity/assignment/Assignment';

describe('InMemoryAuthorizationContextRepository', () => {
  let repo: InMemoryAuthorizationContextRepository;

  beforeEach(() => {
    repo = new InMemoryAuthorizationContextRepository();
  });

  const defaultValidFrom = new Date('2025-01-01T00:00:00Z');

  it('12. repository save/findByAuthUid', async () => {
    const assignment = Assignment.create({
      personId: 'p1',
      daycareId: 'd1',
      corporateEmail: 'test@example.com',
      authUid: 'u1',
      institutionalRole: 'TEACHER',
      roomIds: [],
      validFrom: defaultValidFrom
    });

    const ctx = AuthorizationContext.fromAssignment(assignment);
    await repo.save(ctx);

    const found = await repo.findByAuthUid('u1');
    expect(found).not.toBeNull();
    expect(found?.personId).toBe('p1');
  });

  it('13. unknown authUid returns null', async () => {
    const found = await repo.findByAuthUid('unknown');
    expect(found).toBeNull();
  });

  it('14. same authUid context replacement works & 21. rotation scenario passes', async () => {
    const assignmentA = Assignment.create({
      personId: 'PersonA',
      daycareId: 'd1',
      corporateEmail: 'test@example.com',
      authUid: 'u1',
      institutionalRole: 'TEACHER',
      roomIds: [],
      validFrom: defaultValidFrom
    });

    const ctxA = AuthorizationContext.fromAssignment(assignmentA);
    await repo.save(ctxA);

    // Assignment A deactivates in the DB (simulated)
    assignmentA.deactivate(new Date('2025-06-01T00:00:00Z'));

    // Assignment B is created for a new person but same authUid
    const assignmentB = Assignment.create({
      personId: 'PersonB',
      daycareId: 'd1',
      corporateEmail: 'test@example.com',
      authUid: 'u1', // same authUid
      institutionalRole: 'TEACHER',
      roomIds: [],
      validFrom: new Date('2025-06-02T00:00:00Z')
    });

    const ctxB = AuthorizationContext.fromAssignment(assignmentB);
    await repo.save(ctxB); // Replaces the context for 'u1'

    const found = await repo.findByAuthUid('u1');

    // 15. replacement changes current personId
    expect(found?.personId).toBe('PersonB');
    // 16. replacement changes current assignmentId
    expect(found?.assignmentId).toBe(assignmentB.id);

    // 17. historical Assignment remains untouched (it's inactive and intact)
    expect(assignmentA.status).toBe('INACTIVE');
    expect(assignmentA.personId).toBe('PersonA');
  });
});
