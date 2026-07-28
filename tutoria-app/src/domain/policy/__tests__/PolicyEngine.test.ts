import { describe, it, expect, vi } from 'vitest';
import { PolicyEngine } from '../PolicyEngine';
import { InMemoryPolicyRegistry } from '../PolicyRegistry';
import { Policy } from '../Policy';
import { PolicySeverity } from '../PolicySeverity';
import { PolicyCode } from '../PolicyCode';
import { PolicyContext } from '../PolicyContext';

interface TestContext extends PolicyContext {}

class MockPolicy implements Policy<TestContext> {
  constructor(
    public id: string,
    public severity: PolicySeverity,
    private shouldPass: boolean,
    private isWarning: boolean = false
  ) {}
  name = 'Mock';
  description = 'Mock';
  
  evaluate(context: TestContext) {
    if (this.shouldPass && !this.isWarning) {
      return { passed: true, violations: [], warnings: [], executionTime: 1, policyId: this.id };
    }
    if (this.isWarning) {
      return { 
        passed: true, 
        violations: [], 
        warnings: [{ code: PolicyCode.create('TST-001'), severity: this.severity, messageKey: 'test.warn' }], 
        executionTime: 1, 
        policyId: this.id 
      };
    }
    return { 
      passed: false, 
      violations: [{ code: PolicyCode.create('TST-001'), severity: this.severity, messageKey: 'test.err' }], 
      warnings: [], 
      executionTime: 1, 
      policyId: this.id 
    };
  }
}

describe('PolicyEngine', () => {
  it('evaluates passing policies', () => {
    const registry = new InMemoryPolicyRegistry<TestContext>();
    registry.register(new MockPolicy('1', PolicySeverity.ERROR, true));
    
    const engine = new PolicyEngine(registry);
    const report = engine.evaluate({ targetId: '1', timestamp: new Date() });
    
    expect(report.passed).toBe(true);
    expect(report.score).toBe(100);
    expect(report.evaluatedPolicies).toBe(1);
    expect(report.passedPolicies).toBe(1);
    expect(report.failedPolicies).toBe(0);
  });

  it('calculates blocking issues properly', () => {
    const registry = new InMemoryPolicyRegistry<TestContext>();
    registry.register(new MockPolicy('1', PolicySeverity.BLOCKING, false));
    registry.register(new MockPolicy('2', PolicySeverity.ERROR, false));
    registry.register(new MockPolicy('3', PolicySeverity.WARNING, true, true));
    
    const engine = new PolicyEngine(registry);
    const report = engine.evaluate({ targetId: '1', timestamp: new Date() });
    
    expect(report.passed).toBe(false);
    expect(report.violations.length).toBe(2);
    expect(report.blockingIssues.length).toBe(1);
    expect(report.warnings.length).toBe(1);
    expect(report.evaluatedPolicies).toBe(3);
    expect(report.passedPolicies).toBe(1);
    expect(report.failedPolicies).toBe(2);
    expect(report.score).toBeCloseTo(33.33, 1);
  });
});
