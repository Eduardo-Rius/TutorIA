import { GenerativeConstraint } from './GenerativeConstraint';

export interface GenerativeCapability {
  readonly name: string;
  readonly description: string;
  getConstraints(): readonly GenerativeConstraint[];
}
