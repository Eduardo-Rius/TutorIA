import { InfrastructureContext } from './createInfrastructure';

export interface ApplicationContext {
  // Services use infrastructure
}

export function createApplication(infra: InfrastructureContext): ApplicationContext {
  return {};
}
