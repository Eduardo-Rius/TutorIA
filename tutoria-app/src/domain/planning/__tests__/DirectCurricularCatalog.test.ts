import { describe, it, expect } from 'vitest';
import {
  DIRECT_PDA_CATALOG,
  DIRECT_PDA_CATALOG_BY_ID,
  DIRECT_PDA_CATALOG_BY_PLAN_CELL,
  TUTORIA_DIRECT_PDA_CATALOG_REVISION,
  DirectPDAEntry,
} from '../DirectCurricularCatalog';

describe('DIRECT 40-PDA Canonical Curricular Catalog Foundation', () => {
  it('should declare an explicitly TutorIA-internal catalog revision', () => {
    expect(TUTORIA_DIRECT_PDA_CATALOG_REVISION).toBe('TUTORIA-DIRECT-PDA-CATALOG-R1');
  });

  it('should contain exactly 40 authoritative PDA entries', () => {
    expect(DIRECT_PDA_CATALOG).toBeDefined();
    expect(DIRECT_PDA_CATALOG.length).toBe(40);
  });

  it('should assign sequential internal IDs from TUTORIA-PDA-0001 to TUTORIA-PDA-0040', () => {
    expect(DIRECT_PDA_CATALOG[0].id).toBe('TUTORIA-PDA-0001');
    expect(DIRECT_PDA_CATALOG[39].id).toBe('TUTORIA-PDA-0040');

    DIRECT_PDA_CATALOG.forEach((entry, index) => {
      const expectedId = `TUTORIA-PDA-${String(index + 1).padStart(4, '0')}`;
      expect(entry.id).toBe(expectedId);
    });
  });

  it('should ensure all 40 internal IDs are strictly unique', () => {
    const ids = DIRECT_PDA_CATALOG.map((entry) => entry.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(40);
  });

  it('should ensure all 40 (Campo, Contenido, PDA) tuples are strictly unique', () => {
    const tuples = DIRECT_PDA_CATALOG.map(
      (entry) => `${entry.campoFormativo}:::${entry.contenido}:::${entry.pda}`
    );
    const uniqueTuples = new Set(tuples);
    expect(uniqueTuples.size).toBe(40);
  });

  it('should ensure all 40 entries have non-empty Campo, Contenido, and PDA text', () => {
    DIRECT_PDA_CATALOG.forEach((entry: DirectPDAEntry) => {
      expect(entry.campoFormativo.trim().length).toBeGreaterThan(0);
      expect(entry.contenido.trim().length).toBeGreaterThan(0);
      expect(entry.pda.trim().length).toBeGreaterThan(0);
    });
  });

  it('should preserve exact source provenance for all 40 entries', () => {
    DIRECT_PDA_CATALOG.forEach((entry: DirectPDAEntry) => {
      expect(entry.provenance.sourceFormCode).toBe('3D11-009-003');
      expect(entry.provenance.sourceSheet).toBe('Anexo5_Planeación Reverso (2)');
      expect(entry.provenance.contenidoRange).toMatch(/^B\d+(:B\d+)?$/);
      expect(entry.provenance.pdaCell).toMatch(/^C\d+$/);
      expect(entry.provenance.enLaPlaneacionCell).toMatch(/^D\d+$/);
    });
  });

  it('should ensure all 40 enLaPlaneacionCell coordinates are strictly unique and unmerged', () => {
    const planCells = DIRECT_PDA_CATALOG.map((entry) => entry.provenance.enLaPlaneacionCell);
    const uniquePlanCells = new Set(planCells);
    expect(uniquePlanCells.size).toBe(40);
  });

  it('should cover the 4 official Campos Formativos with exact expected counts', () => {
    const campoCounts = DIRECT_PDA_CATALOG.reduce((acc, entry) => {
      acc[entry.campoFormativo] = (acc[entry.campoFormativo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    expect(campoCounts['Lenguajes']).toBe(11);
    expect(campoCounts['Saberes y Pensamiento Científico']).toBe(8);
    expect(campoCounts['Ética, Naturaleza y Sociedades']).toBe(8);
    expect(campoCounts['De lo Humano y lo Comunitario']).toBe(13);
  });

  it('should correctly index all entries in immutable lookup maps', () => {
    expect(DIRECT_PDA_CATALOG_BY_ID.size).toBe(40);
    expect(DIRECT_PDA_CATALOG_BY_PLAN_CELL.size).toBe(40);

    DIRECT_PDA_CATALOG.forEach((entry) => {
      expect(DIRECT_PDA_CATALOG_BY_ID.get(entry.id)).toBe(entry);
      expect(DIRECT_PDA_CATALOG_BY_PLAN_CELL.get(entry.provenance.enLaPlaneacionCell)).toBe(entry);
    });
  });

  it('should be immutable / frozen by design', () => {
    expect(Object.isFrozen(DIRECT_PDA_CATALOG)).toBe(true);
  });
});
