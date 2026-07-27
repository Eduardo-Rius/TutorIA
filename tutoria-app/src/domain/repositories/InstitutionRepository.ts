import { Repository } from '../../shared/kernel/Repository';
import { InstitutionId } from '../../shared/value-objects/Ids';
import { Institution } from '../organization/institution/Institution';

export interface InstitutionRepository extends Repository<Institution, InstitutionId> {
  // We don't add specific speculative methods like existsByCode unless justified.
  // The contract enforces save, findById, and exists by default.
}
