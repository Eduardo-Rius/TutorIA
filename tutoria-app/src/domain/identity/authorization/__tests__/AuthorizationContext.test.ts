import { describe, it, expect } from 'vitest';
import { AuthorizationContext } from '../AuthorizationContext';
import { Assignment } from '../../assignment/Assignment';

describe('AuthorizationContext', () => {
  const defaultValidFrom = new Date('2025-01-01T00:00:00Z');

  it('1. context derives from ACTIVE Assignment & correctly maps fields', () => {
    const assignment = Assignment.create({
      personId: 'person-123',
      daycareId: 'daycare-456',
      corporateEmail: 'test@example.com',
      authUid: 'UID-xyz',
      institutionalRole: 'TEACHER',
      roomIds: ['room-A', 'room-B'],
      validFrom: defaultValidFrom
    });

    const ctx = AuthorizationContext.fromAssignment(assignment);

    expect(ctx.authUid).toBe(assignment.authUid);
    expect(ctx.personId).toBe(assignment.personId);
    expect(ctx.assignmentId).toBe(assignment.id);
    expect(ctx.institutionalRole).toBe(assignment.institutionalRole);
    expect(ctx.authorizedDaycareIds).toEqual([assignment.daycareId]);
    expect(ctx.roomIds).toEqual(assignment.roomIds);
    expect(ctx.active).toBe(true);
    expect(ctx.validFrom).toBe(assignment.validFrom);
    expect(ctx.validTo).toBeNull();
  });

  it('9. INACTIVE -> active false', () => {
    const assignment = Assignment.create({
      personId: 'person-123',
      daycareId: 'daycare-456',
      corporateEmail: 'test@example.com',
      authUid: 'UID-xyz',
      institutionalRole: 'TEACHER',
      roomIds: [],
      validFrom: defaultValidFrom
    });

    assignment.deactivate(new Date('2025-12-31T00:00:00Z'));
    const ctx = AuthorizationContext.fromAssignment(assignment);

    expect(ctx.active).toBe(false);
    expect(ctx.validTo).toEqual(new Date('2025-12-31T00:00:00Z'));
  });

  it('20. no corporateEmail field (Contract check)', () => {
    const assignment = Assignment.create({
      personId: 'person-1',
      daycareId: 'daycare-1',
      corporateEmail: 'test@example.com',
      authUid: 'UID',
      institutionalRole: 'TEACHER',
      roomIds: [],
      validFrom: defaultValidFrom
    });

    const ctx = AuthorizationContext.fromAssignment(assignment);
    expect((ctx as any).corporateEmail).toBeUndefined();
    expect(Object.keys(ctx.props)).not.toContain('corporateEmail');
  });

  it('A. Teacher fromAssignment => [assignment.daycareId]', () => {
    const assignment = Assignment.create({
      personId: 'p', daycareId: 'd-1', corporateEmail: 'e', authUid: 'u',
      institutionalRole: 'TEACHER', roomIds: [], validFrom: defaultValidFrom
    });
    const ctx = AuthorizationContext.fromAssignment(assignment);
    expect(ctx.authorizedDaycareIds).toEqual(['d-1']);
  });

  it('B. Director fromAssignment => [assignment.daycareId]', () => {
    const assignment = Assignment.create({
      personId: 'p', daycareId: 'd-1', corporateEmail: 'e', authUid: 'u',
      institutionalRole: 'DIRECTOR', roomIds: [], validFrom: defaultValidFrom
    });
    const ctx = AuthorizationContext.fromAssignment(assignment);
    expect(ctx.authorizedDaycareIds).toEqual(['d-1']);
  });

  it('C. Supervisor fromAssignment default => [assignment.daycareId]', () => {
    const assignment = Assignment.create({
      personId: 'p', daycareId: 'd-1', corporateEmail: 'e', authUid: 'u',
      institutionalRole: 'SUPERVISOR', roomIds: [], validFrom: defaultValidFrom
    });
    const ctx = AuthorizationContext.fromAssignment(assignment);
    expect(ctx.authorizedDaycareIds).toEqual(['d-1']);
  });

  it('D. Supervisor can explicitly receive two canonical daycareIds.', () => {
    const assignment = Assignment.create({
      personId: 'p', daycareId: 'd-1', corporateEmail: 'e', authUid: 'u',
      institutionalRole: 'SUPERVISOR', roomIds: [], validFrom: defaultValidFrom
    });
    const ctx = AuthorizationContext.fromAssignment(assignment, ['d-2']);
    expect(ctx.authorizedDaycareIds).toEqual(['d-1', 'd-2']);
  });

  it('F. Supervisor scope must include assignment.daycareId.', () => {
    const assignment = Assignment.create({
      personId: 'p', daycareId: 'd-1', corporateEmail: 'e', authUid: 'u',
      institutionalRole: 'SUPERVISOR', roomIds: [], validFrom: defaultValidFrom
    });
    // Even if provided array doesn't have it, it's merged
    const ctx = AuthorizationContext.fromAssignment(assignment, ['d-2', 'd-3']);
    expect(ctx.authorizedDaycareIds).toEqual(['d-1', 'd-2', 'd-3']);
  });

  it('G. Duplicate daycareIds are normalized safely.', () => {
    const assignment = Assignment.create({
      personId: 'p', daycareId: 'd-1', corporateEmail: 'e', authUid: 'u',
      institutionalRole: 'SUPERVISOR', roomIds: [], validFrom: defaultValidFrom
    });
    const ctx = AuthorizationContext.fromAssignment(assignment, ['d-1', 'd-2', 'd-2']);
    expect(ctx.authorizedDaycareIds).toEqual(['d-1', 'd-2']);
  });

  it('H. Teacher cannot expand scope to a second daycare.', () => {
    const assignment = Assignment.create({
      personId: 'p', daycareId: 'd-1', corporateEmail: 'e', authUid: 'u',
      institutionalRole: 'TEACHER', roomIds: [], validFrom: defaultValidFrom
    });
    expect(() => AuthorizationContext.fromAssignment(assignment, ['d-2']))
      .toThrow('Only SUPERVISOR role can have an expanded multi-daycare scope.');
  });

  it('I. Director cannot expand scope to a second daycare.', () => {
    const assignment = Assignment.create({
      personId: 'p', daycareId: 'd-1', corporateEmail: 'e', authUid: 'u',
      institutionalRole: 'DIRECTOR', roomIds: [], validFrom: defaultValidFrom
    });
    expect(() => AuthorizationContext.fromAssignment(assignment, ['d-2']))
      .toThrow('Only SUPERVISOR role can have an expanded multi-daycare scope.');
  });

  it('J. returned authorizedDaycareIds array is defensive / immutable externally.', () => {
    const assignment = Assignment.create({
      personId: 'p', daycareId: 'd-1', corporateEmail: 'e', authUid: 'u',
      institutionalRole: 'SUPERVISOR', roomIds: [], validFrom: defaultValidFrom
    });
    const ctx = AuthorizationContext.fromAssignment(assignment, ['d-2']);

    // Mutate the returned array
    ctx.authorizedDaycareIds.push('d-3');

    // Original inside should be unaffected
    expect(ctx.authorizedDaycareIds).toEqual(['d-1', 'd-2']);
  });

  it('1. reconstitute rejects ACTIVE empty scope', () => {
    expect(() => AuthorizationContext.reconstitute({
      authUid: 'u', personId: 'p', assignmentId: 'a',
      institutionalRole: 'TEACHER', authorizedDaycareIds: [], roomIds: [],
      active: true, validFrom: defaultValidFrom, validTo: null
    })).toThrow('authorizedDaycareIds cannot be empty for an active context.');
  });

  it('2. reconstitute rejects TEACHER multi-daycare', () => {
    expect(() => AuthorizationContext.reconstitute({
      authUid: 'u', personId: 'p', assignmentId: 'a',
      institutionalRole: 'TEACHER', authorizedDaycareIds: ['d-1', 'd-2'], roomIds: [],
      active: true, validFrom: defaultValidFrom, validTo: null
    })).toThrow('Only SUPERVISOR role can have an expanded multi-daycare scope.');
  });

  it('3. reconstitute rejects DIRECTOR multi-daycare', () => {
    expect(() => AuthorizationContext.reconstitute({
      authUid: 'u', personId: 'p', assignmentId: 'a',
      institutionalRole: 'DIRECTOR', authorizedDaycareIds: ['d-1', 'd-2'], roomIds: [],
      active: true, validFrom: defaultValidFrom, validTo: null
    })).toThrow('Only SUPERVISOR role can have an expanded multi-daycare scope.');
  });

  it('4. reconstitute accepts SUPERVISOR multi-daycare', () => {
    const ctx = AuthorizationContext.reconstitute({
      authUid: 'u', personId: 'p', assignmentId: 'a',
      institutionalRole: 'SUPERVISOR', authorizedDaycareIds: ['d-1', 'd-2'], roomIds: [],
      active: true, validFrom: defaultValidFrom, validTo: null
    });
    expect(ctx.authorizedDaycareIds).toEqual(['d-1', 'd-2']);
  });

  it('5. reconstitute deduplicates or deterministically handles duplicate IDs', () => {
    const ctx = AuthorizationContext.reconstitute({
      authUid: 'u', personId: 'p', assignmentId: 'a',
      institutionalRole: 'SUPERVISOR', authorizedDaycareIds: ['d-1', 'd-1', 'd-2'], roomIds: [],
      active: true, validFrom: defaultValidFrom, validTo: null
    });
    expect(ctx.authorizedDaycareIds).toEqual(['d-1', 'd-2']);
  });

  it('6. reconstituted authorizedDaycareIds getter is defensive', () => {
    const ctx = AuthorizationContext.reconstitute({
      authUid: 'u', personId: 'p', assignmentId: 'a',
      institutionalRole: 'SUPERVISOR', authorizedDaycareIds: ['d-1'], roomIds: [],
      active: true, validFrom: defaultValidFrom, validTo: null
    });
    ctx.authorizedDaycareIds.push('d-2');
    expect(ctx.authorizedDaycareIds).toEqual(['d-1']);
  });

  it('7. reconstituted roomIds getter is defensive', () => {
    const ctx = AuthorizationContext.reconstitute({
      authUid: 'u', personId: 'p', assignmentId: 'a',
      institutionalRole: 'SUPERVISOR', authorizedDaycareIds: ['d-1'], roomIds: ['r-1'],
      active: true, validFrom: defaultValidFrom, validTo: null
    });
    ctx.roomIds.push('r-2');
    expect(ctx.roomIds).toEqual(['r-1']);
  });

  it('8. fromAssignment behavior remains unchanged (baseline check)', () => {
    const assignment = Assignment.create({
      personId: 'p', daycareId: 'd-1', corporateEmail: 'e', authUid: 'u',
      institutionalRole: 'SUPERVISOR', roomIds: [], validFrom: defaultValidFrom
    });
    const ctx = AuthorizationContext.fromAssignment(assignment, ['d-2']);
    expect(ctx.authorizedDaycareIds).toEqual(['d-1', 'd-2']);
  });

  it('9. same-authUid rotation behavior remains unchanged', () => {
    const ctx1 = AuthorizationContext.reconstitute({
      authUid: 'u', personId: 'p1', assignmentId: 'a1',
      institutionalRole: 'TEACHER', authorizedDaycareIds: ['d-1'], roomIds: [],
      active: false, validFrom: defaultValidFrom, validTo: new Date()
    });
    const ctx2 = AuthorizationContext.reconstitute({
      authUid: 'u', personId: 'p2', assignmentId: 'a2',
      institutionalRole: 'TEACHER', authorizedDaycareIds: ['d-1'], roomIds: [],
      active: true, validFrom: defaultValidFrom, validTo: null
    });
    // This just proves reconstitute instantiates correctly.
    // The actual rotation overwrite happens in the Repository (which uses authUid).
    expect(ctx1.authUid).toEqual(ctx2.authUid);
    expect(ctx1.personId).not.toEqual(ctx2.personId);
    expect(ctx1.active).toBe(false);
    expect(ctx2.active).toBe(true);
  });
});
