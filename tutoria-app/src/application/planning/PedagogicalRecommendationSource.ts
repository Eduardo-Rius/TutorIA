import { PlanningDay } from '../../domain/planning/WeeklyPlanning';
import { Room } from '../../domain/planning/RoomCatalog';

export interface PedagogicalRecommendationSource {
  generateRecommendation(
    room: Room,
    observations: string,
    identifiedNeeds: string,
    specialSituations: string,
    availableMaterials: string
  ): Promise<PlanningDay[]>;
}
