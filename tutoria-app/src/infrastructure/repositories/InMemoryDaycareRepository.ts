import { DaycareRepository } from '../../application/ports/DaycareRepository';
import { Daycare } from '../../domain/organization/daycare/Daycare';

export class InMemoryDaycareRepository implements DaycareRepository {
  private daycares: Map<string, Daycare> = new Map();

  async findById(daycareId: string): Promise<Daycare | null> {
    const daycare = this.daycares.get(daycareId);
    return daycare ? Daycare.reconstitute(daycare.props) : null;
  }

  async findByDaycareNumber(daycareNumber: string): Promise<Daycare[]> {
    const matches: Daycare[] = [];
    for (const daycare of this.daycares.values()) {
      if (daycare.daycareNumber === daycareNumber) {
        matches.push(Daycare.reconstitute(daycare.props));
      }
    }
    return matches;
  }

  async save(daycare: Daycare): Promise<void> {
    this.daycares.set(daycare.daycareId, Daycare.reconstitute(daycare.props));
  }
}
