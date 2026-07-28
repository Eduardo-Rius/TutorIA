import { PolicyContext } from './PolicyContext';
import { PolicySeverity } from './PolicySeverity';
import { PolicyResult } from './PolicyResult';

export interface Policy<TContext extends PolicyContext> {
  id: string;
  name: string;
  description: string;
  severity: PolicySeverity;
  
  evaluate(context: TContext): PolicyResult;
}
