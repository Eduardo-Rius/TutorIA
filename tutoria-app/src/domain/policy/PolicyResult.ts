import { PolicyViolation } from './PolicyViolation';

export interface PolicyResult {
  passed: boolean;
  violations: PolicyViolation[];
  warnings: PolicyViolation[];
  executionTime: number; // in milliseconds
  policyId: string;
}
