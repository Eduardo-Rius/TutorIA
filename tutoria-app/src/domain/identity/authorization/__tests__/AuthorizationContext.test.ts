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

    // 2. authUid preserved
    expect(ctx.authUid).toBe(assignment.authUid);
    // 3. personId preserved
    expect(ctx.personId).toBe(assignment.personId);
    // 4. assignmentId preserved
    expect(ctx.assignmentId).toBe(assignment.id);
    // 5. daycareId preserved (19. no daycareNumber tenant coupling)
    expect(ctx.daycareId).toBe(assignment.daycareId);
    // 6. institutionalRole preserved
    expect(ctx.institutionalRole).toBe(assignment.institutionalRole);
    // 7. roomIds preserved & 18. multi-room context supported
    expect(ctx.roomIds).toEqual(assignment.roomIds);
    // 8. ACTIVE -> active true
    expect(ctx.active).toBe(true);
    // 10. validFrom preserved
    expect(ctx.validFrom).toBe(assignment.validFrom);
    // 11. validTo preserved
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
});
