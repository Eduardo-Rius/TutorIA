import { Repository } from '../../shared/kernel/Repository';
import { CenterId } from '../../shared/value-objects/Ids';
import { Center } from '../organization/center/Center';

export interface CenterRepository extends Repository<Center, CenterId> {
}
