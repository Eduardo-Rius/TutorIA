import { Repository } from '../../shared/kernel/Repository';
import { ObservationId } from '../../shared/value-objects/Ids'; // Wait, ObservationId was not created.

export interface Observation {}

export interface ObservationRepository extends Repository<Observation, ObservationId> {}
