import { WorkspaceReadModel } from '../workspace/WorkspaceReadModel';
import { ActiveContext } from '../../domain/identity/ActiveContext';

export interface WorkspaceSeedRepository {
  /**
   * Generates a seeded WorkspaceReadModel tailored to the active context (Role/Center)
   */
  getWorkspaceForContext(context: ActiveContext): Promise<WorkspaceReadModel>;
}
