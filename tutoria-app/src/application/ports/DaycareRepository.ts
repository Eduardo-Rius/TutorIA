import { Daycare } from '../../domain/organization/daycare/Daycare';

export interface DaycareRepository {
  findByDaycareNumber(daycareNumber: string): Promise<Daycare | null>;
  save(daycare: Daycare): Promise<void>;
}
