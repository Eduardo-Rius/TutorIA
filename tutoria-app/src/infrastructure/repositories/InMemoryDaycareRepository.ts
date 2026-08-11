import { DaycareRepository } from '../../application/ports/DaycareRepository';
import { Daycare } from '../../domain/organization/daycare/Daycare';

export class InMemoryDaycareRepository implements DaycareRepository {
  private readonly store = new Map<string, Daycare>();

  public async findByDaycareNumber(daycareNumber: string): Promise<Daycare | null> {
    const rawNumber = daycareNumber.trim();
    return this.store.get(rawNumber) || null;
  }

  public async save(daycare: Daycare): Promise<void> {
    this.store.set(daycare.daycareNumber, daycare);
  }

  // Helper for testing
  public async _clear(): Promise<void> {
    this.store.clear();
  }
}
