import { describe, it, expect } from 'vitest';
import { InMemoryAssignmentRepository } from '../InMemoryAssignmentRepository';
import { Assignment } from '../../../domain/identity/assignment/Assignment';
import { Person } from '../../../domain/identity/person/Person';

describe('InMemoryAssignmentRepository', () => {
  const defaultValidFrom = new Date('2025-01-01T00:00:00Z');

  it('21. repository findById, 22. active-by-person, 23. active-by-daycare, 24. active-by-authUid', async () => {
    const repo = new InMemoryAssignmentRepository();
    const a = Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: 'test@test.com',
      authUid: 'u1', institutionalRole: 'TEACHER', roomIds: [], validFrom: defaultValidFrom
    });

    await repo.save(a);

    const byId = await repo.findById(a.id);
    expect(byId?.id).toBe(a.id);

    const byPerson = await repo.findActiveByPersonId('p1');
    expect(byPerson).toHaveLength(1);
    expect(byPerson[0]?.id).toBe(a.id);

    const byDaycare = await repo.findActiveByDaycareId('d1');
    expect(byDaycare).toHaveLength(1);
    expect(byDaycare[0]?.id).toBe(a.id);

    const byAuthUid = await repo.findActiveByAuthUid('u1');
    expect(byAuthUid?.id).toBe(a.id);
  });

  it('25. duplicate ACTIVE authUid rejected', async () => {
    const repo = new InMemoryAssignmentRepository();
    const a1 = Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: 'test1@test.com',
      authUid: 'shared-uid', institutionalRole: 'TEACHER', roomIds: [], validFrom: defaultValidFrom
    });
    const a2 = Assignment.create({
      personId: 'p2', daycareId: 'd2', corporateEmail: 'test2@test.com',
      authUid: 'shared-uid', institutionalRole: 'TEACHER', roomIds: [], validFrom: defaultValidFrom
    });

    await repo.save(a1);
    await expect(repo.save(a2)).rejects.toThrow(/authUid shared-uid is already actively assigned/);
  });

  it('26. INACTIVE old + ACTIVE new same authUid allowed', async () => {
    const repo = new InMemoryAssignmentRepository();
    const oldAssignment = Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: 'test@test.com',
      authUid: 'shared-uid', institutionalRole: 'TEACHER', roomIds: [], validFrom: defaultValidFrom
    });
    oldAssignment.deactivate(new Date('2025-12-31T00:00:00Z'));
    await repo.save(oldAssignment);

    const newAssignment = Assignment.create({
      personId: 'p2', daycareId: 'd2', corporateEmail: 'test2@test.com',
      authUid: 'shared-uid', institutionalRole: 'TEACHER', roomIds: [], validFrom: new Date('2026-01-01T00:00:00Z')
    });
    await repo.save(newAssignment); // Should not throw

    const activeForUid = await repo.findActiveByAuthUid('shared-uid');
    expect(activeForUid?.id).toBe(newAssignment.id);
  });

  it('27. mandatory full rotation scenario passes', async () => {
    const repo = new InMemoryAssignmentRepository();

    // Create Person A conceptually
    const personA = Person.create({ firstName: 'Person', lastName: 'A' });
    const assignmentA = Assignment.create({
      personId: personA.personId,
      authUid: 'AUTH_X',
      corporateEmail: 'pedagogia@tutor.ia',
      daycareId: 'DAYCARE_D',
      institutionalRole: 'TEACHER',
      roomIds: [],
      validFrom: defaultValidFrom
    });
    await repo.save(assignmentA);

    // Deactivate Assignment A
    assignmentA.deactivate(new Date('2025-12-31T00:00:00Z'));
    await repo.save(assignmentA);

    // Create Person B conceptually
    const personB = Person.create({ firstName: 'Person', lastName: 'B' });
    const assignmentB = Assignment.create({
      personId: personB.personId,
      authUid: 'AUTH_X', // Same authUid
      corporateEmail: 'pedagogia@tutor.ia', // Same email
      daycareId: 'DAYCARE_D', // Same daycare
      institutionalRole: 'TEACHER',
      roomIds: [],
      validFrom: new Date('2026-01-01T00:00:00Z')
    });
    await repo.save(assignmentB);

    // Assertions
    const savedA = await repo.findById(assignmentA.id);
    const savedB = await repo.findById(assignmentB.id);

    expect(savedA).toBeDefined();
    expect(savedA?.personId).toBe(personA.personId);
    expect(savedA?.status).toBe('INACTIVE');
    expect(savedA?.validTo).toBeDefined();

    expect(savedB).toBeDefined();
    expect(savedB?.id).not.toBe(savedA?.id);
    expect(savedB?.personId).toBe(personB.personId);
    expect(savedB?.status).toBe('ACTIVE');

    // same email did NOT imply same Person
    expect(savedA?.personId).not.toBe(savedB?.personId);
  });
});
