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

  it('A. G-0001 remains G-0001', async () => {
    await importer.importRows([{ daycareNumber: 'G-0001', daycareName: 'Test', active: true }], 'v1.xlsx', '1.0');
    const d = await repository.findByDaycareNumber('G-0001');
    expect(d?.daycareNumber).toBe('G-0001');
  });

  it('B. Prefix distinctions remain intact', async () => {
    await importer.importRows([
      { daycareNumber: 'G-0001', daycareName: 'Test G', active: true },
      { daycareNumber: 'U-0001', daycareName: 'Test U', active: true }
    ], 'v1.xlsx', '1.0');
    const dg = await repository.findByDaycareNumber('G-0001');
    const du = await repository.findByDaycareNumber('U-0001');
    expect(dg).not.toBeNull();
    expect(du).not.toBeNull();
    expect(dg?.daycareNumber).not.toBe(du?.daycareNumber);
  });

  it('C. Missing daycare number is invalid', async () => {
    const report = await importer.importRows([
      { daycareName: 'Missing', active: true },
      { daycareNumber: '   ', daycareName: 'Empty String', active: true }
    ], 'v1.xlsx', '1.0');
    expect(report.missingDaycareNumbers).toBe(2);
    expect(report.invalidRows).toBe(2);
  });

  it('D. Blank optional institutional fields become null', async () => {
    await importer.importRows([{ daycareNumber: 'G-0003', daycareName: 'Required', active: true, type: '   ' }], 'v1.xlsx', '1.0');
    const d = await repository.findByDaycareNumber('G-0003');
    expect(d?.props.type).toBeNull();
    expect(d?.props.state).toBeNull(); // undefined -> null
  });

  it('E. Postal code remains string', async () => {
    await importer.importRows([{ daycareNumber: 'G-0004', daycareName: 'Test', active: true, postalCode: '04360' }], 'v1.xlsx', '1.0');
    const d = await repository.findByDaycareNumber('G-0004');
    expect(d?.props.postalCode).toBe('04360');
  });

  it('F. Coordinates parse correctly', async () => {
    await importer.importRows([{ daycareNumber: 'G-0005', daycareName: 'Test', active: true, latitude: 19.4326, longitude: -99.1332 }], 'v1.xlsx', '1.0');
    const d = await repository.findByDaycareNumber('G-0005');
    expect(d?.props.latitude).toBe(19.4326);
    expect(d?.props.longitude).toBe(-99.1332);
  });

  it('G. SHA-256 is deterministic', async () => {
    const hash1 = await DaycareDirectoryImporter.computeInstitutionalHash({ daycareNumber: 'G-0001', daycareName: 'Test', active: true });
    const hash2 = await DaycareDirectoryImporter.computeInstitutionalHash({ daycareNumber: 'G-0001', daycareName: 'Test', active: true });
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 is 64 hex chars
  });

  it('H. Institutional field change changes hash', async () => {
    const hash1 = await DaycareDirectoryImporter.computeInstitutionalHash({ daycareNumber: 'G-0001', daycareName: 'Test', phone: '111', active: true });
    const hash2 = await DaycareDirectoryImporter.computeInstitutionalHash({ daycareNumber: 'G-0001', daycareName: 'Test', phone: '222', active: true });
    expect(hash1).not.toBe(hash2);
  });

  it('I. active change DOES NOT change institutional hash', async () => {
    const hash1 = await DaycareDirectoryImporter.computeInstitutionalHash({ daycareNumber: 'G-0001', daycareName: 'Test', active: true });
    const hash2 = await DaycareDirectoryImporter.computeInstitutionalHash({ daycareNumber: 'G-0001', daycareName: 'Test', active: false });
    expect(hash1).toBe(hash2); // Hash should exclude 'active'
  });

  it('J. duplicate daycare number is detected', async () => {
    const report = await importer.importRows([
      { daycareNumber: 'G-0001', daycareName: 'First', active: true },
      { daycareNumber: 'G-0001', daycareName: 'Duplicate', active: true }
    ], 'v1.xlsx', '1.0');
    expect(report.duplicateDaycareNumbers).toBe(1);
    expect(report.invalidRows).toBe(1);
    expect(report.validRows).toBe(1);
  });

  it('K. exact lookup succeeds', async () => {
    await importer.importRows([{ daycareNumber: 'U-0010', daycareName: 'Lookup', active: true }], 'v1.xlsx', '1.0');
    const result = await repository.findByDaycareNumber('U-0010');
    expect(result).not.toBeNull();
    expect(result?.daycareNumber).toBe('U-0010');
  });

  it('L. unknown lookup returns null', async () => {
    const result = await repository.findByDaycareNumber('X-9999');
    expect(result).toBeNull();
  });
});
