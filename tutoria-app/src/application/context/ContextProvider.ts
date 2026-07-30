import { ContextRequirement, ContextSnapshot, ContextCapability } from '../../domain/context';

export interface ContextProvider {
  /**
   * Puerto responsable de resolver un conjunto de ContextRequirement y devolver
   * un ContextSnapshot consistente para una ContextCapability.
   */
  resolveContext(capability: ContextCapability, requirements: readonly ContextRequirement[]): Promise<ContextSnapshot>;
}
