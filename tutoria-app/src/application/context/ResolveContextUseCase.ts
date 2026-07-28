import { ContextProvider } from './ContextProvider';
import { ContextCapability, ContextSnapshot } from '../../domain/context';

export class ResolveContextUseCase {
  constructor(private readonly contextProvider: ContextProvider) {}

  public async execute(capability: ContextCapability): Promise<ContextSnapshot> {
    const requirements = capability.getRequirements();
    return this.contextProvider.resolveContext(capability, requirements);
  }
}
