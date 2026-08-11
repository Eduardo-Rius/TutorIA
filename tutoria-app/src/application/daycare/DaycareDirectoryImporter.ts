import { Daycare, DaycareProps, DaycareImportMetadata } from '../../domain/organization/daycare/Daycare';
import { DaycareRepository } from '../ports/DaycareRepository';

export interface ImporterReport {
  totalParsed: number;
  validRows: number;
  invalidRows: number;
  missingDaycareNumbers: number;
  updatedRecords: number;
  unchangedRecords: number;
  errors: string[];
}

export type RawDaycareRow = Partial<Omit<DaycareProps, 'metadata' | 'active' | 'id'>> & { active?: boolean | string };

export class DaycareDirectoryImporter {
  constructor(private readonly repository: DaycareRepository) {}

  public async importRows(
    rows: RawDaycareRow[],
    sourceFile: string,
    sourceVersion: string
  ): Promise<ImporterReport> {
    const report: ImporterReport = {
      totalParsed: rows.length,
      validRows: 0,
      invalidRows: 0,
      missingDaycareNumbers: 0,
      updatedRecords: 0,
      unchangedRecords: 0,
      errors: []
    };

    for (const [index, row] of rows.entries()) {
      const rowNum = index + 1; // 1-indexed for human readability in logs
      const rawNumber = row.daycareNumber?.trim();
      if (!rawNumber) {
        report.missingDaycareNumbers++;
        report.invalidRows++;
        report.errors.push(`Row ${rowNum}: Missing daycare number.`);
        continue;
      }

      let active = true;
      if (typeof row.active === 'boolean') {
        active = row.active;
      } else if (typeof row.active === 'string') {
        active = row.active.toLowerCase() !== 'false' && row.active !== '0';
      }

      try {
        const daycareData: Omit<DaycareProps, 'metadata' | 'id'> = {
          daycareNumber: rawNumber,
          daycareName: row.daycareName || '',
          type: row.type ?? null,
          state: row.state ?? null,
          locality: row.locality ?? null,
          municipality: row.municipality ?? null,
          street: row.street ?? null,
          neighborhood: row.neighborhood ?? null,
          exteriorNumber: row.exteriorNumber ?? null,
          postalCode: row.postalCode ?? null,
          schedule: row.schedule ?? null,
          supervisionZone: row.supervisionZone ?? null,
          supervisedDaycares: row.supervisedDaycares ?? null,
          supervisorPhone: row.supervisorPhone ?? null,
          phone: row.phone ?? null,
          latitude: typeof row.latitude === 'number' ? row.latitude : null,
          longitude: typeof row.longitude === 'number' ? row.longitude : null,
          active
        };

        const recordHash = await DaycareDirectoryImporter.computeInstitutionalHash(daycareData);

        const metadata: DaycareImportMetadata = {
          sourceFile,
          sourceVersion,
          importedAt: new Date().toISOString(),
          recordHash
        };

        const newDaycare = Daycare.create(daycareData, metadata);

        // Find existing daycares with the exact same daycareNumber
        const existingList = await this.repository.findByDaycareNumber(rawNumber);

        // Find if one of them is the EXACT same physical record (exact hash)
        const identical = existingList.find(d => d.recordHash === newDaycare.recordHash);

        if (identical) {
          report.unchangedRecords++;
        } else {
          // It's either a brand new daycare sharing the same number,
          // or an update to an existing one. We just save it as new because
          // we do not invent a reconciliation heuristic in this stage.
          await this.repository.save(newDaycare);
          report.updatedRecords++;
        }

        report.validRows++;
      } catch (e: any) {
        report.invalidRows++;
        report.errors.push(`Row ${rowNum}: Processing error - ${e.message}`);
      }
    }

    return report;
  }

  public static async computeInstitutionalHash(props: Omit<DaycareProps, 'metadata' | 'id'>): Promise<string> {
    // Deterministic string representation of strictly institutional data.
    // EXCLUDES: active, metadata, id
    const cleanStr = (val: string | null | undefined): string | null => {
      if (val === undefined || val === null) return null;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    };

    const cleanNum = (val: number | null | undefined): number | null => {
      if (val === undefined || val === null || isNaN(val)) return null;
      return val;
    };

    const str = [
      props.daycareNumber.trim(),
      cleanStr(props.daycareName) || '',
      cleanStr(props.type),
      cleanStr(props.state),
      cleanStr(props.locality),
      cleanStr(props.municipality),
      cleanStr(props.street),
      cleanStr(props.neighborhood),
      cleanStr(props.exteriorNumber),
      cleanStr(props.postalCode),
      cleanStr(props.schedule),
      cleanStr(props.supervisionZone),
      cleanStr(props.supervisedDaycares),
      cleanStr(props.supervisorPhone),
      cleanStr(props.phone),
      cleanNum(props.latitude),
      cleanNum(props.longitude)
    ].map(v => v === null ? 'null' : String(v)).join('|');

    return DaycareDirectoryImporter.sha256(str);
  }

  private static async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    let hashBuffer: ArrayBuffer;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    } else {
      const nodeCrypto = await import('crypto');
      hashBuffer = nodeCrypto.createHash('sha256').update(msgBuffer).digest();
    }
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
