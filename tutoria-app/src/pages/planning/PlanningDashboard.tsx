import React from 'react';
import { PlanningDemoApp } from '../../presentation/planning-ui/PlanningDemoApp';

import { PlanningWorkflowService } from '../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../application/planning/DeterministicPedagogicalRecommendationSource';

const repo = new InMemoryWeeklyPlanningRepository();
const service = new PlanningWorkflowService(repo);
const source = new DeterministicPedagogicalRecommendationSource();

export const PlanningDashboard: React.FC = () => {
  return (
    <PlanningDemoApp service={service} source={source} />
  );
};
