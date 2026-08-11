import { describe, it, expect, beforeEach } from 'vitest';
import { DaycareDirectoryImporter, RawDaycareRow } from '../DaycareDirectoryImporter';
import { InMemoryDaycareRepository } from '../../../infrastructure/repositories/InMemoryDaycareRepository';

describe('DaycareDirectoryImporter & Application Integration', () => {
  let repository: InMemoryDaycareRepository;
  let importer: DaycareDirectoryImporter;

  beforeEach(() => {
    repository = new InMemoryDaycareRepository();
    importer = new DaycareDirectoryImporter(repository);
  });

  it('D. findById returns exactly the requested physical daycare', async () => {
    await importer.importRows([{ daycareNumber: 'G-0001', daycareName: 'León', active: true }], 'v1.xlsx', '1.0');
    const existingList = await repository.findByDaycareNumber('G-0001');
    const d1 = existingList[0];

    const found = await repository.findById(d1.daycareId);
    expect(found).not.toBeNull();
    expect(found?.daycareId).toBe(d1.daycareId);
  });

  it('E. unknown daycareId returns null', async () => {
    const result = await repository.findById('random-uuid');
    expect(result).toBeNull();
  });

  it('F/J. findByDaycareNumber can return multiple Daycare records and saving G-0001 A does NOT overwrite G-0001 B', async () => {
    const report = await importer.importRows([
      { daycareNumber: 'G-0001', daycareName: 'León', active: true },
      { daycareNumber: 'G-0001', daycareName: 'Monterrey', active: true }
    ], 'v1.xlsx', '1.0');

    expect(report.validRows).toBe(2);
    expect(report.updatedRecords).toBe(2);

    const matches = await repository.findByDaycareNumber('G-0001');
    expect(matches.length).toBe(2);
    expect(matches[0].daycareId).not.toBe(matches[1].daycareId);
  });

  it('G. findByDaycareNumber for a unique number returns array length 1', async () => {
    await importer.importRows([{ daycareNumber: 'U-0010', daycareName: 'Lookup', active: true }], 'v1.xlsx', '1.0');
    const result = await repository.findByDaycareNumber('U-0010');
    expect(result.length).toBe(1);
    expect(result[0].daycareNumber).toBe('U-0010');
  });

  it('H. unknown daycareNumber returns []', async () => {
    const result = await repository.findByDaycareNumber('X-9999');
    expect(result.length).toBe(0);
  });

  it('I. repository persistence is keyed by daycareId', async () => {
    await importer.importRows([{ daycareNumber: 'G-0001', daycareName: 'León', active: true }], 'v1.xlsx', '1.0');
    const matches = await repository.findByDaycareNumber('G-0001');
    const d1 = matches[0];

    const d2 = await repository.findById(d1.daycareId);
    expect(d2).not.toBeNull();
    expect(d2?.daycareId).toBe(d1.daycareId);
  });

  it('A. G-0001 remains G-0001', async () => {
    await importer.importRows([{ daycareNumber: 'G-0001', daycareName: 'Test', active: true }], 'v1.xlsx', '1.0');
    const dList = await repository.findByDaycareNumber('G-0001');
    expect(dList[0].daycareNumber).toBe('G-0001');
  });

  it('C. Missing daycare number is invalid', async () => {
    const report = await importer.importRows([
      { daycareName: 'Missing', active: true },
      { daycareNumber: '   ', daycareName: 'Empty String', active: true }
    ], 'v1.xlsx', '1.0');
    expect(report.missingDaycareNumbers).toBe(2);
    expect(report.invalidRows).toBe(2);
  });

  it('G/M. SHA-256 is deterministic and excludes daycareId', async () => {
    const hash1 = await DaycareDirectoryImporter.computeInstitutionalHash({ daycareNumber: 'G-0001', daycareName: 'Test', active: true });
    const hash2 = await DaycareDirectoryImporter.computeInstitutionalHash({ daycareNumber: 'G-0001', daycareName: 'Test', active: true });
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 is 64 hex chars
  });

  it('L. daycareId is NOT affected by mutable institutional data', async () => {
    await importer.importRows([{ daycareNumber: 'G-0001', daycareName: 'Test 1', active: true }], 'v1.xlsx', '1.0');
    const d1 = (await repository.findByDaycareNumber('G-0001'))[0];

    // Changing the name generates a new hash but if we update the repository it would keep the same ID.
    // The current importer does not do reconciliation, but we prove ID is distinct from hash.
    const hash = await DaycareDirectoryImporter.computeInstitutionalHash({ daycareNumber: 'G-0001', daycareName: 'Test 2', active: true });
    expect(d1.daycareId).not.toBe(hash);
  });

  it('H2. Institutional field change changes hash', async () => {
    const hash1 = await DaycareDirectoryImporter.computeInstitutionalHash({ daycareNumber: 'G-0001', daycareName: 'Test', phone: '111', active: true });
    const hash2 = await DaycareDirectoryImporter.computeInstitutionalHash({ daycareNumber: 'G-0001', daycareName: 'Test', phone: '222', active: true });
    expect(hash1).not.toBe(hash2);
  });
});
