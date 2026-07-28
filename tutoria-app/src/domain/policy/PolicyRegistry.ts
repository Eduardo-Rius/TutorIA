import { Policy } from './Policy';
import { PolicyContext } from './PolicyContext';

export interface PolicyRegistry<TContext extends PolicyContext> {
  register(policy: Policy<TContext>): void;
  getPolicies(): Policy<TContext>[];
  clear(): void;
}

export class InMemoryPolicyRegistry<TContext extends PolicyContext> implements PolicyRegistry<TContext> {
  private policies: Policy<TContext>[] = [];

  register(policy: Policy<TContext>): void {
    if (!this.policies.find(p => p.id === policy.id)) {
      this.policies.push(policy);
    }
  }

  getPolicies(): Policy<TContext>[] {
    return [...this.policies];
  }
  
  clear(): void {
    this.policies = [];
  }
}
