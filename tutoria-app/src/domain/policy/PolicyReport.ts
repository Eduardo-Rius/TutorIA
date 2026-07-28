import { PolicyViolation } from './PolicyViolation';

export interface PolicyReport {
  passed: boolean;
  score: number; // 0 to 100
  violations: PolicyViolation[];
  warnings: PolicyViolation[];
  blockingIssues: PolicyViolation[];
  executionTime: number;
  evaluatedPolicies: number;
  passedPolicies: number;
  failedPolicies: number;
}
