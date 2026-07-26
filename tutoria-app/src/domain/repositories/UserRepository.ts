import { Repository } from '../../shared/kernel/Repository';
import { UserId } from '../../shared/value-objects/Ids';

export interface User {}

export interface UserRepository extends Repository<User, UserId> {}
