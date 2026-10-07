import React, { useMemo } from 'react';
import { PlanningDemoApp } from '../../presentation/planning-ui/PlanningDemoApp';
import { PlanningWorkflowService } from '../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { FirestoreWeeklyPlanningRepository } from '../../infrastructure/repositories/FirestoreWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../application/planning/DeterministicPedagogicalRecommendationSource';
import { evaluateFirstLightLabGuard } from '../../presentation/planning-ui/firstLightLabHarness';
import type { WeeklyPlanningRepository } from '../../application/ports/WeeklyPlanningRepository';
import type { PedagogicalRecommendationSource } from '../../application/planning/PedagogicalRecommendationSource';

export interface PlanningDashboardProps {
  repository?: WeeklyPlanningRepository;
  service?: PlanningWorkflowService;
  source?: PedagogicalRecommendationSource;
  firstLightEnv?: Record<string, any>;
  initialAction?: 'new' | 'continue' | string;
}

export const PlanningDashboard: React.FC<PlanningDashboardProps> = ({
  repository: customRepo,
  service: customService,
  source: customSource,
  firstLightEnv,
  initialAction,
}) => {
  const guard = useMemo(() => evaluateFirstLightLabGuard(firstLightEnv), [firstLightEnv]);

  const effectiveRepo = useMemo<WeeklyPlanningRepository>(() => {
    if (customRepo) return customRepo;
    if (guard.isEligible) {
      return new FirestoreWeeklyPlanningRepository();
    }
    return new InMemoryWeeklyPlanningRepository();
  }, [customRepo, guard.isEligible]);

  const effectiveService = useMemo(() => {
    if (customService) return customService;
    return new PlanningWorkflowService(effectiveRepo);
  }, [customService, effectiveRepo]);

  const effectiveSource = useMemo(() => {
    if (customSource) return customSource;
    return new DeterministicPedagogicalRecommendationSource();
  }, [customSource]);

  const effectiveAction = useMemo(() => {
    if (initialAction) return initialAction;
    if (typeof window !== 'undefined' && window.location?.search) {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'new') return 'new';
      } catch {}
    }
    return undefined;
  }, [initialAction]);

  return (
    <PlanningDemoApp
      service={effectiveService}
      source={effectiveSource}
      firstLightEnv={firstLightEnv}
      initialAction={effectiveAction}
    />
  );
};
