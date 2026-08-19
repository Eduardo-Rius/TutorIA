import { describe, it, expect } from 'vitest';
import { ProvisionModality } from '../value-objects/ProvisionModality';
import { Daycare } from '../Daycare';

describe('ProvisionModality and Daycare Integration', () => {
  const defaultMetadata = {
    sourceFile: 'test.csv',
    sourceVersion: '1.0',
    importedAt: new Date().toISOString(),
    recordHash: 'hash'
  };

  it('A. DIRECT can be represented', () => {
    const modalityResult = ProvisionModality.create('DIRECT');
    expect(modalityResult.isSuccess).toBe(true);
    expect(modalityResult.getValue().isDirect()).toBe(true);
    expect(modalityResult.getValue().isIndirect()).toBe(false);
  });

  it('B. INDIRECT can be represented', () => {
    const modalityResult = ProvisionModality.create('INDIRECT');
    expect(modalityResult.isSuccess).toBe(true);
    expect(modalityResult.getValue().isIndirect()).toBe(true);
    expect(modalityResult.getValue().isDirect()).toBe(false);
  });

  it('C. unsupported modality is rejected', () => {
    const invalidValues = ['PRIVATE', 'PUBLIC', 'DIRECTA', 'INDIRECTA', '', 'OTHER'];
    for (const val of invalidValues) {
      expect(ProvisionModality.create(val).isFailure).toBe(true);
    }
  });

  it('D. Daycare can own DIRECT', () => {
    const daycare = Daycare.create({
      daycareNumber: 'G-0001',
      daycareName: 'Test Daycare',
      active: true,
      modality: 'DIRECT'
    }, defaultMetadata);
    expect(daycare.modality).toBeDefined();
    expect(daycare.modality!.isDirect()).toBe(true);
  });

  it('E. Daycare can own INDIRECT', () => {
    const daycare = Daycare.create({
      daycareNumber: 'G-0002',
      daycareName: 'Test Daycare 2',
      active: true,
      modality: 'INDIRECT'
    }, defaultMetadata);
    expect(daycare.modality).toBeDefined();
    expect(daycare.modality!.isIndirect()).toBe(true);
  });

  it('F. Daycare exposes its modality', () => {
    const daycare = Daycare.create({
      daycareNumber: 'G-0003',
      daycareName: 'Test Daycare 3',
      active: true,
      modality: 'DIRECT'
    }, defaultMetadata);
    expect(daycare.modality).toBeInstanceOf(ProvisionModality);
    expect(daycare.modality!.value).toBe('DIRECT');
  });

  it('G. modality cannot silently mutate outside approved domain behavior', () => {
    const daycare = Daycare.create({
      daycareNumber: 'G-0004',
      daycareName: 'Test',
      active: true,
      modality: 'DIRECT'
    }, defaultMetadata);
    // There are no mutators on ProvisionModality
    expect(() => {
      (daycare.modality as any).value = 'INDIRECT';
    }).toThrow();
  });

  it('H. existing Daycare behavior remains valid according to the chosen compatibility strategy', () => {
    // Missing modality is gracefully accepted as undefined
    const daycare = Daycare.create({
      daycareNumber: 'G-0005',
      daycareName: 'Legacy Daycare',
      active: true
    }, defaultMetadata);
    expect(daycare.modality).toBeUndefined();

    // Reconstituting existing records without modality works
    const reconstituted = Daycare.reconstitute({
      id: 'some-id',
      daycareNumber: 'G-0005',
      daycareName: 'Legacy',
      active: true
    });
    expect(reconstituted.modality).toBeUndefined();
  });

  it('I. rejects invalid modality upon creation and reconstitution', () => {
    expect(() => {
      Daycare.create({
        daycareNumber: 'G-0006',
        daycareName: 'Test',
        active: true,
        modality: 'PRIVATE' as any
      }, defaultMetadata);
    }).toThrow(/Invalid provision modality/);

    expect(() => {
      Daycare.reconstitute({
        id: 'some-id',
        daycareNumber: 'G-0006',
        daycareName: 'Test',
        active: true,
        modality: 'PRIVATE' as any
      });
    }).toThrow(/Invalid provision modality in persisted data/);
  });
});
