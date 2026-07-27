import { Repository } from '../../shared/kernel/Repository';
import { GroupId } from '../../shared/value-objects/Ids';
import { Group } from '../organization/group/Group';

export interface GroupRepository extends Repository<Group, GroupId> {
}
