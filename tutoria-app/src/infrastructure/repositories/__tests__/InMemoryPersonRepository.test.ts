import { describe, it, expect } from 'vitest';
import { InMemoryPersonRepository } from '../InMemoryPersonRepository';
import { Person } from '../../../domain/identity/person/Person';

describe('InMemoryPersonRepository', () => {
  it('Q. Repository save/findById preserves canonical person identity', async () => {
    const repo = new InMemoryPersonRepository();
    const p = Person.create({ firstName: 'Ana', lastName: 'García' });

    await repo.save(p);

    const found = await repo.findById(p.personId);
    expect(found).not.toBeNull();
    expect(found?.personId).toBe(p.personId);
    expect(found?.firstName).toBe(p.firstName);
  });

  it('R. Unknown personId returns null', async () => {
    const repo = new InMemoryPersonRepository();
    const result = await repo.findById('invalid-id');
    expect(result).toBeNull();
  });

  it('S. Two historical persons can coexist independently without credential information', async () => {
    const repo = new InMemoryPersonRepository();
    const p1 = Person.create({ firstName: 'Ana', lastName: 'García' });
    const p2 = Person.create({ firstName: 'Ana', lastName: 'García' });

    await repo.save(p1);
    await repo.save(p2);

    const found1 = await repo.findById(p1.personId);
    const found2 = await repo.findById(p2.personId);

    expect(found1).not.toBeNull();
    expect(found2).not.toBeNull();
    expect(found1?.personId).not.toBe(found2?.personId);
  });
});
