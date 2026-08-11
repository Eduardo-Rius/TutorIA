import { Daycare } from '../../../domain/organization/daycare/Daycare';

export interface DaycareRepository {
  findById(daycareId: string): Promise<Daycare | null>;
  findByDaycareNumber(daycareNumber: string): Promise<Daycare[]>;
  save(daycare: Daycare): Promise<void>;
}
