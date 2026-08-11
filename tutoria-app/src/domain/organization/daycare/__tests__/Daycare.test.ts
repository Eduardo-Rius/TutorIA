import { describe, it, expect } from 'vitest';
import { Daycare, DaycareImportMetadata } from '../Daycare';

describe('Official IMSS Daycare Catalog Domain Entity', () => {

  const defaultMetadata: DaycareImportMetadata = {
    sourceFile: 'v1.xlsx',
    sourceVersion: '1.0',
    importedAt: '2023-01-01T00:00:00.000Z',
    recordHash: 'dummy-hash'
  };

  it('1. Preserves full daycare number exact canonical identifiers (e.g. G-0001, E-0017)', () => {
    const d1 = Daycare.create({ daycareNumber: 'G-0001', daycareName: 'Guarderia 1', active: true }, defaultMetadata);
    const d2 = Daycare.create({ daycareNumber: 'E-0017', daycareName: 'Guarderia 17', active: true }, defaultMetadata);

    expect(d1.daycareNumber).toBe('G-0001');
    expect(d2.daycareNumber).toBe('E-0017');
  });

  it('2. Preserves prefix distinctions (G-0001 is distinct from U-0001)', () => {
    const d1 = Daycare.create({ daycareNumber: 'G-0001', daycareName: 'G', active: true }, defaultMetadata);
    const d2 = Daycare.create({ daycareNumber: 'U-0001', daycareName: 'U', active: true }, defaultMetadata);

    expect(d1.daycareNumber).not.toBe(d2.daycareNumber);
  });

  it('12. No invented institutional fields (verifies public contract structure)', () => {
    const d1 = Daycare.create({ daycareNumber: 'G-0001', daycareName: 'A', active: true }, defaultMetadata);
    // Test public contract structure directly
    const propsKeys = Object.keys(d1.props);
    expect(propsKeys).not.toContain('delegation');
    expect(propsKeys).not.toContain('capacity');
    expect(propsKeys).not.toContain('director');
  });
});
