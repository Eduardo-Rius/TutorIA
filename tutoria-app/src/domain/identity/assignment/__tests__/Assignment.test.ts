import { describe, it, expect } from 'vitest';
import { Assignment, InstitutionalRole } from '../Assignment';

describe('Assignment Domain Entity', () => {
  const defaultValidFrom = new Date('2025-01-01T00:00:00Z');

  it('1. UUID generation & 2. two assignments produce different IDs', () => {
    const a1 = Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: 'test@example.com',
      authUid: 'uid1', institutionalRole: 'TEACHER', roomIds: ['r1'], validFrom: defaultValidFrom
    });
    const a2 = Assignment.create({
      personId: 'p2', daycareId: 'd2', corporateEmail: 'test2@example.com',
      authUid: 'uid2', institutionalRole: 'TEACHER', roomIds: ['r1'], validFrom: defaultValidFrom
    });
    expect(a1.id).toBeDefined();
    expect(typeof a1.id).toBe('string');
    expect(a1.id.length).toBeGreaterThan(30);
    expect(a1.id).not.toBe(a2.id);
  });

  it('3. personId preserved & 4. daycareId preserved', () => {
    const a = Assignment.create({
      personId: 'person-123', daycareId: 'daycare-456', corporateEmail: 'test@example.com',
      authUid: 'uid1', institutionalRole: 'TEACHER', roomIds: [], validFrom: defaultValidFrom
    });
    expect(a.personId).toBe('person-123');
    expect(a.daycareId).toBe('daycare-456');
  });

  it('5. corporateEmail trim/lowercase & 6. authUid preserved', () => {
    const a = Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: '  TEST@Example.com  ',
      authUid: 'Uid-789', institutionalRole: 'TEACHER', roomIds: [], validFrom: defaultValidFrom
    });
    expect(a.corporateEmail).toBe('test@example.com');
    expect(a.authUid).toBe('Uid-789'); // Case preserved for UIDs
  });

  it('7. TEACHER, 8. DIRECTOR, 9. SUPERVISOR accepted & 10. unsupported role rejected', () => {
    const roles: InstitutionalRole[] = ['TEACHER', 'DIRECTOR', 'SUPERVISOR'];
    roles.forEach(role => {
      const a = Assignment.create({
        personId: 'p1', daycareId: 'd1', corporateEmail: 'test@test.com',
        authUid: 'u1', institutionalRole: role, roomIds: [], validFrom: defaultValidFrom
      });
      expect(a.institutionalRole).toBe(role);
    });

    expect(() => Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: 'test@test.com',
      authUid: 'u1', institutionalRole: 'INVALID' as any, roomIds: [], validFrom: defaultValidFrom
    })).toThrow();
  });

  it('11. one room & 12. multiple rooms supported & 13. empty rooms supported', () => {
    const a1 = Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: 'test@test.com',
      authUid: 'u1', institutionalRole: 'TEACHER', roomIds: ['room1'], validFrom: defaultValidFrom
    });
    expect(a1.roomIds).toEqual(['room1']);

    const a2 = Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: 'test@test.com',
      authUid: 'u1', institutionalRole: 'TEACHER', roomIds: ['room1', 'room2'], validFrom: defaultValidFrom
    });
    expect(a2.roomIds).toEqual(['room1', 'room2']);

    const a3 = Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: 'test@test.com',
      authUid: 'u1', institutionalRole: 'DIRECTOR', roomIds: [], validFrom: defaultValidFrom
    });
    expect(a3.roomIds).toEqual([]);
  });

  it('14. ACTIVE implies validTo null', () => {
    const a = Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: 'test@test.com',
      authUid: 'u1', institutionalRole: 'TEACHER', roomIds: [], validFrom: defaultValidFrom
    });
    expect(a.status).toBe('ACTIVE');
    expect(a.validTo).toBeNull();
  });

  it('15. deactivate creates INACTIVE state & 16. sets validTo', () => {
    const a = Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: 'test@test.com',
      authUid: 'u1', institutionalRole: 'TEACHER', roomIds: [], validFrom: defaultValidFrom
    });
    const deactDate = new Date('2025-12-31T00:00:00Z');
    a.deactivate(deactDate);
    expect(a.status).toBe('INACTIVE');
    expect(a.validTo).toEqual(deactDate);
  });

  it('17. validTo before validFrom rejected', () => {
    const a = Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: 'test@test.com',
      authUid: 'u1', institutionalRole: 'TEACHER', roomIds: [], validFrom: defaultValidFrom
    });
    expect(() => a.deactivate(new Date('2024-01-01T00:00:00Z'))).toThrow();
  });

  it('18. second deactivation rejected', () => {
    const a = Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: 'test@test.com',
      authUid: 'u1', institutionalRole: 'TEACHER', roomIds: [], validFrom: defaultValidFrom
    });
    a.deactivate(new Date('2025-12-31T00:00:00Z'));
    expect(() => a.deactivate(new Date('2026-01-01T00:00:00Z'))).toThrow();
  });

  it('19. reconstitution preserves ID & 20. historical timestamps', () => {
    const original = Assignment.create({
      personId: 'p1', daycareId: 'd1', corporateEmail: 'test@test.com',
      authUid: 'u1', institutionalRole: 'TEACHER', roomIds: [], validFrom: defaultValidFrom
    });
    original.deactivate(new Date('2025-12-31T00:00:00Z'));

    const reconstituted = Assignment.reconstitute(original.props);
    expect(reconstituted.id).toBe(original.id);
    expect(reconstituted.personId).toBe(original.personId);
    expect(reconstituted.status).toBe('INACTIVE');
    expect(reconstituted.validTo).toEqual(new Date('2025-12-31T00:00:00Z'));
    expect(reconstituted.createdAt).toEqual(original.createdAt);
  });
});
