import { ContextRequirement } from './ContextRequirement';
import { ContextSnapshot } from './ContextSnapshot';
import { ContextScore } from './ContextScore';
import { ContextFragment } from './ContextFragment';
import { ContextComponent } from './ContextComponent';

export class ContextAssembler {
  /**
   * Pure domain operation that assembles resolved pieces into a ContextSnapshot.
   */
  public assemble(
    id: string,
    requirements: readonly ContextRequirement[],
    resolvedComponents: readonly ContextComponent[],
    resolvedFragments: readonly ContextFragment[],
    timestamp: Date
  ): ContextSnapshot {
    
    // Deduplicate fragments based on ID
    const uniqueFragments = Array.from(new Map(resolvedFragments.map(f => [f.id, f])).values());
    // Deduplicate components based on type
    const uniqueComponents = Array.from(new Map(resolvedComponents.map(c => [c.type, c])).values());

    const requiredReqs = requirements.filter(r => r.isRequired);
    
    // Calculate a mock coverage based on requirements vs actual resolved fragments
    // In a real system, we'd map which fragment fulfills which requirement
    const coverage = requiredReqs.length > 0 ? 
      Math.min(100, (uniqueFragments.length / requiredReqs.length) * 100) : 100;
      
    // Calculate average freshness based on components
    const freshness = 100; // Mock 100 for now
    // Calculate average authority
    const authority = 100; // Mock 100 for now
    
    // Calculate average relevance from fragments
    const relevance = uniqueFragments.length > 0 ? 
      uniqueFragments.reduce((acc, f) => acc + f.relevance, 0) / uniqueFragments.length : 100;
    
    const score = ContextScore.create({
      coverage,
      freshness,
      authority,
      relevance
    });

    return new ContextSnapshot(
      id,
      timestamp,
      uniqueComponents,
      uniqueFragments,
      score
    );
  }
}
