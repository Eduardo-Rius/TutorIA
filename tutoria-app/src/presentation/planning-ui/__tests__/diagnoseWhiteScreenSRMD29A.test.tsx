import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_ANITA_EMAIL,
} from '../firstLightLabHarness';
import type { AuthenticationProvider } from '../../../application/ports/AuthenticationProvider';
import { App } from '../../../App';

vi.mock('../../../infrastructure/firebase/firebaseConfig', () => ({
  app: {},
  auth: {},
  db: {},
}));

const eligibleLabEnvG001 = {
  [FIRST_LIGHT_LAB_FLAG]: 'true',
  VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
  VITE_TUTORIA_LOGIN_SCOPE: 'G001',
};

function createMockAuth(
  uid: string = FIRST_LIGHT_TEACHER_ID,
  email: string = FIRST_LIGHT_ANITA_EMAIL
): AuthenticationProvider {
  return {
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue({ uid, email }),
  };
}

describe('SR-MD-29A Diagnostic and Verification for Maternal A and Maternal B1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('Maternal A opens form directly when URL has roomId=room-maternal-a&action=new', async () => {
    window.history.pushState({}, '', '/workspace/planning?roomId=room-maternal-a&action=new');

    const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
    const source = new DeterministicPedagogicalRecommendationSource();
    const auth = createMockAuth(FIRST_LIGHT_TEACHER_ID, FIRST_LIGHT_ANITA_EMAIL);

    render(
      <PlanningDemoApp
        service={service}
        source={source}
        firstLightEnv={eligibleLabEnvG001}
        firstLightAuth={auth}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(screen.getByText('Planeación Semanal')).toBeTruthy();
    expect(screen.getByText('← Volver al listado')).toBeTruthy();
    expect(screen.getByText('✨ Ayúdame con TutorIA (Generar Semana)')).toBeTruthy();
  });

  it('Maternal B1 opens form directly when URL has roomId=room-maternal-b1&action=new', async () => {
    window.history.pushState({}, '', '/workspace/planning?roomId=room-maternal-b1&action=new');

    const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
    const source = new DeterministicPedagogicalRecommendationSource();
    const auth = createMockAuth(FIRST_LIGHT_TEACHER_ID, FIRST_LIGHT_ANITA_EMAIL);

    render(
      <PlanningDemoApp
        service={service}
        source={source}
        firstLightEnv={eligibleLabEnvG001}
        firstLightAuth={auth}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(screen.getByText('Planeación Semanal')).toBeTruthy();
    expect(screen.getByText('← Volver al listado')).toBeTruthy();
    expect(screen.getByText('✨ Ayúdame con TutorIA (Generar Semana)')).toBeTruthy();
  });

  it('Maternal B1 appears in room selector in LIST view and can navigate to new planning form', async () => {
    window.history.pushState({}, '', '/workspace/planning');

    const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
    const source = new DeterministicPedagogicalRecommendationSource();
    const auth = createMockAuth(FIRST_LIGHT_TEACHER_ID, FIRST_LIGHT_ANITA_EMAIL);

    render(
      <PlanningDemoApp
        service={service}
        source={source}
        firstLightEnv={eligibleLabEnvG001}
        firstLightAuth={auth}
      />
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Check room selector tabs
    const selector = screen.getByTestId('teacher-room-selector');
    expect(selector).toBeTruthy();

    const matB1Tab = screen.getByTestId('room-tab-room-maternal-b1');
    expect(matB1Tab).toBeTruthy();
    expect(matB1Tab.textContent).toBe('Maternal B1');

    const matATab = screen.getByTestId('room-tab-room-maternal-a');
    expect(matATab).toBeTruthy();
    expect(matATab.textContent).toBe('Maternal A');

    // Click Maternal B1 tab
    await act(async () => {
      fireEvent.click(matB1Tab);
    });

    // Verify Maternal B1 is active in list
    expect(screen.getAllByText(/Maternal B1/).length).toBeGreaterThan(0);

    // Click Nueva Planeación
    const newBtn = screen.getByRole('button', { name: /\+ Nueva Planeación/i });
    await act(async () => {
      fireEvent.click(newBtn);
    });

    // Verify wizard opened
    expect(screen.getByText('Planeación Semanal')).toBeTruthy();
    expect(screen.getByText('✨ Ayúdame con TutorIA (Generar Semana)')).toBeTruthy();
  });
});
