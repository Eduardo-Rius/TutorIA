import { Repository } from '../../shared/kernel/Repository';
import { KnowledgeSourceId } from '../../shared/value-objects/Ids';

export interface KnowledgeSource {}

export interface KnowledgeRepository extends Repository<KnowledgeSource, KnowledgeSourceId> {}
