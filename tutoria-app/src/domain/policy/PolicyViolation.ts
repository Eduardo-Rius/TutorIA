import { PolicySeverity } from './PolicySeverity';
import { PolicyCode } from './PolicyCode';

export interface PolicyViolation {
  code: PolicyCode;
  severity: PolicySeverity;
  field?: string;
  messageKey: string;
  metadata?: Record<string, unknown>;
}
