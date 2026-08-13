import { describe, it, expect } from 'vitest';
import { Person } from '../Person';

describe('Person Domain Entity', () => {
  it('A. Person receives a valid canonical UUID', () => {
    const p = Person.create({ firstName: 'Ana', lastName: 'García' });
    expect(p.personId).toBeDefined();
    expect(typeof p.personId).toBe('string');
    expect(p.personId.length).toBeGreaterThan(30);
  });

  it('B. Two persons with identical firstName/lastName receive distinct personIds', () => {
    const p1 = Person.create({ firstName: 'Ana', lastName: 'García' });
    const p2 = Person.create({ firstName: 'Ana', lastName: 'García' });
    expect(p1.personId).not.toBe(p2.personId);
  });

  it('C. personId can be preserved during controlled rehydration', () => {
    const p1 = Person.create({ firstName: 'Ana', lastName: 'García' });
    const rehydrated = Person.reconstitute({
      id: p1.personId,
      firstName: p1.firstName,
      lastName: p1.lastName,
      createdAt: p1.createdAt,
    });
    expect(rehydrated.personId).toBe(p1.personId);
  });

  it('D. firstName is trimmed', () => {
    const p = Person.create({ firstName: '  Ana  ', lastName: 'García' });
    expect(p.firstName).toBe('Ana');
  });

  it('E. lastName is trimmed', () => {
    const p = Person.create({ firstName: 'Ana', lastName: '  García  ' });
    expect(p.lastName).toBe('García');
  });

  it('F. displayName is deterministically derived', () => {
    const p = Person.create({ firstName: 'Ana', lastName: 'García' });
    expect(p.displayName).toBe('Ana García');
  });

  it('G. empty firstName is rejected', () => {
    expect(() => Person.create({ firstName: '', lastName: 'García' })).toThrow();
  });

  it('H. whitespace-only firstName is rejected', () => {
    expect(() => Person.create({ firstName: '   ', lastName: 'García' })).toThrow();
  });

  it('I. empty lastName is rejected', () => {
    expect(() => Person.create({ firstName: 'Ana', lastName: '' })).toThrow();
  });

  it('J. whitespace-only lastName is rejected', () => {
    expect(() => Person.create({ firstName: 'Ana', lastName: '   ' })).toThrow();
  });

  it('K. accents and original spelling are preserved', () => {
    const p = Person.create({ firstName: 'María José', lastName: 'López-Gómez' });
    expect(p.firstName).toBe('María José');
    expect(p.lastName).toBe('López-Gómez');
    expect(p.displayName).toBe('María José López-Gómez');
  });

  it('L-P. Person has no credential or assignment fields (Contract Verification)', () => {
    const p = Person.create({ firstName: 'Ana', lastName: 'García' });
    const propsKeys = Object.keys(p.props);

    expect(propsKeys).not.toContain('corporateEmail');
    expect(propsKeys).not.toContain('email');
    expect(propsKeys).not.toContain('authUid');
    expect(propsKeys).not.toContain('daycareId');
    expect(propsKeys).not.toContain('role');
    expect(propsKeys).not.toContain('roomIds');
    expect(propsKeys).toContain('id');
    expect(propsKeys).toContain('firstName');
    expect(propsKeys).toContain('lastName');
    expect(propsKeys).toContain('createdAt');
  });
});
