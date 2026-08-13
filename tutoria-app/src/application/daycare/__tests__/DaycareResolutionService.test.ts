import { describe, it, expect, beforeEach } from 'vitest';
import { DaycareResolutionService } from '../DaycareResolutionService';
import { InMemoryDaycareRepository } from '../../../infrastructure/repositories/InMemoryDaycareRepository';
import { Daycare, DaycareImportMetadata } from '../../../domain/organization/daycare/Daycare';

describe('DaycareResolutionService', () => {
  let repository: InMemoryDaycareRepository;
  let service: DaycareResolutionService;

  const defaultMetadata: DaycareImportMetadata = {
    sourceFile: 'test.xlsx',
    sourceVersion: '1.0',
    importedAt: '2023-01-01T00:00:00.000Z',
    recordHash: 'dummy'
  };

  beforeEach(() => {
    repository = new InMemoryDaycareRepository();
    service = new DaycareResolutionService(repository);
  });

  const seedDaycare = async (props: { daycareNumber: string; daycareName: string }): Promise<Daycare> => {
    const d = Daycare.create({ ...props, active: true }, defaultMetadata);
    await repository.save(d);
    return d;
  };

  it('A. unknown number → NOT_FOUND', async () => {
    const result = await service.resolveDaycareNumber('X-9999');
    expect(result.status).toBe('NOT_FOUND');
  });

  it('B/C. unique number → RESOLVED and contains canonical daycareId', async () => {
    const seeded = await seedDaycare({ daycareNumber: 'U-0010', daycareName: 'Unique' });
    const result = await service.resolveDaycareNumber('U-0010');

    expect(result.status).toBe('RESOLVED');
    if (result.status === 'RESOLVED') {
      expect(result.daycare.daycareId).toBe(seeded.daycareId);
      expect(result.daycare.daycareNumber).toBe('U-0010');
    }
  });

  it('D/E. two physical daycares with same daycareNumber → AMBIGUOUS and returns both distinct daycareIds', async () => {
    const d1 = await seedDaycare({ daycareNumber: 'G-0001', daycareName: 'León' });
    const d2 = await seedDaycare({ daycareNumber: 'G-0001', daycareName: 'Monterrey' });

    const result = await service.resolveDaycareNumber('G-0001');
    expect(result.status).toBe('AMBIGUOUS');
    if (result.status === 'AMBIGUOUS') {
      expect(result.candidates.length).toBe(2);
      const ids = result.candidates.map(c => c.daycareId);
      expect(ids).toContain(d1.daycareId);
      expect(ids).toContain(d2.daycareId);
      expect(d1.daycareId).not.toBe(d2.daycareId);
    }
  });

  it('F. three or more candidates are supported', async () => {
    await seedDaycare({ daycareNumber: 'G-0001', daycareName: 'León' });
    await seedDaycare({ daycareNumber: 'G-0001', daycareName: 'Monterrey' });
    await seedDaycare({ daycareNumber: 'G-0001', daycareName: 'Tijuana' });

    const result = await service.resolveDaycareNumber('G-0001');
    expect(result.status).toBe('AMBIGUOUS');
    if (result.status === 'AMBIGUOUS') {
      expect(result.candidates.length).toBe(3);
    }
  });

  it('G. service contains no hardcoded G-0001...G-0005 behavior', async () => {
    // If we seed any other duplicate number, it acts AMBIGUOUS
    await seedDaycare({ daycareNumber: 'X-9999', daycareName: 'A' });
    await seedDaycare({ daycareNumber: 'X-9999', daycareName: 'B' });

    const result = await service.resolveDaycareNumber('X-9999');
    expect(result.status).toBe('AMBIGUOUS');
  });

  it('H. leading/trailing input whitespace does not prevent valid lookup', async () => {
    await seedDaycare({ daycareNumber: 'G-0001', daycareName: 'León' });
    const result = await service.resolveDaycareNumber('   G-0001   ');
    expect(result.status).toBe('RESOLVED');
  });

  it('I. prefix and leading zeros remain intact', async () => {
    const d = await seedDaycare({ daycareNumber: '0054', daycareName: 'Zeroes' });
    const result = await service.resolveDaycareNumber('0054');
    expect(result.status).toBe('RESOLVED');
    if (result.status === 'RESOLVED') {
      expect(result.daycare.daycareNumber).toBe('0054');
    }
  });

  it('J. valid selected daycareId for ambiguous number is accepted', async () => {
    const d1 = await seedDaycare({ daycareNumber: 'G-0001', daycareName: 'León' });
    await seedDaycare({ daycareNumber: 'G-0001', daycareName: 'Monterrey' });

    const selected = await service.validateSelection('G-0001', d1.daycareId);
    expect(selected).not.toBeNull();
    expect(selected?.daycareId).toBe(d1.daycareId);
  });

  it('K. daycareId belonging to another daycareNumber is rejected', async () => {
    await seedDaycare({ daycareNumber: 'G-0001', daycareName: 'León' });
    const unrelated = await seedDaycare({ daycareNumber: 'U-1233', daycareName: 'Unrelated' });

    const selected = await service.validateSelection('G-0001', unrelated.daycareId);
    expect(selected).toBeNull();
  });

  it('L. nonexistent daycareId is rejected', async () => {
    await seedDaycare({ daycareNumber: 'G-0001', daycareName: 'León' });
    const selected = await service.validateSelection('G-0001', 'random-uuid');
    expect(selected).toBeNull();
  });

  it('M. same daycareNumber does NOT imply same physical daycare', async () => {
    const d1 = await seedDaycare({ daycareNumber: 'G-0001', daycareName: 'León' });
    const d2 = await seedDaycare({ daycareNumber: 'G-0001', daycareName: 'Monterrey' });
    expect(d1.daycareId).not.toBe(d2.daycareId);
  });
});
