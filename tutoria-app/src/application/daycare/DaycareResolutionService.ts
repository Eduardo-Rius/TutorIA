import { Daycare } from '../../domain/organization/daycare/Daycare';
import { DaycareRepository } from '../ports/DaycareRepository';

export type DaycareResolutionResult =
  | { status: 'RESOLVED'; daycare: Daycare }
  | { status: 'AMBIGUOUS'; candidates: Daycare[] }
  | { status: 'NOT_FOUND' };

export class DaycareResolutionService {
  constructor(private readonly repository: DaycareRepository) {}

  /**
   * Resolves a raw daycare number string from a user into a specific physical Daycare
   * or a list of ambiguous candidates.
   */
  public async resolveDaycareNumber(rawNumber: string): Promise<DaycareResolutionResult> {
    const safeNumber = rawNumber.trim();
    if (!safeNumber) {
      return { status: 'NOT_FOUND' };
    }

    const matches = await this.repository.findByDaycareNumber(safeNumber);

    if (matches.length === 0) {
      return { status: 'NOT_FOUND' };
    }

    if (matches.length === 1) {
      return { status: 'RESOLVED', daycare: matches[0] };
    }

    return { status: 'AMBIGUOUS', candidates: matches };
  }

  /**
   * Validates that a user-selected daycareId legitimately belongs to the candidate
   * set produced by their supplied daycareNumber.
   *
   * This guarantees a user cannot submit a valid daycareId that belongs to a
   * completely different IMSS daycare number.
   *
   * @returns The canonical Daycare if valid, or null if invalid or cross-tenant attempt.
   */
  public async validateSelection(rawNumber: string, selectedDaycareId: string): Promise<Daycare | null> {
    const safeNumber = rawNumber.trim();
    if (!safeNumber || !selectedDaycareId) {
      return null;
    }

    const matches = await this.repository.findByDaycareNumber(safeNumber);
    const validCandidate = matches.find(daycare => daycare.daycareId === selectedDaycareId);

    if (!validCandidate) {
      return null;
    }

    return validCandidate;
  }
}
