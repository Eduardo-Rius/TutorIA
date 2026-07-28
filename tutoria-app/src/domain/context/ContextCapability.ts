import { ContextRequirement } from './ContextRequirement';

export interface ContextCapability {
  readonly name: string;
  getRequirements(): readonly ContextRequirement[];
}
