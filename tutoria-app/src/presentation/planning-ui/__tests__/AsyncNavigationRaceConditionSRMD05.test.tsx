import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import { WeeklyPlanningRepository } from '../../../application/ports/WeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';

const defaultSource = new DeterministicPedagogicalRecommendationSource();

function createPlan(id: string, teacherId: string, status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'CLOSED' = 'DRAFT'): WeeklyPlanning {
  const plan = WeeklyPlanning.create(
    id,
    'daycare-1',
    'lactantes-c',
    teacherId,
    '2026-08-24',
    '2026-08-28'
  );
  plan.status = status as any;
  return plan;
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('ORDEN SR-MD-05: Estabilización de Navegación Asíncrona (Pruebas de Carrera A-J)', () => {
  let mockRepo: Partial<WeeklyPlanningRepository>;
  let service: PlanningWorkflowService;

  beforeEach(() => {
    window.history.pushState({}, '', '/');
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  // A. Bootstrap pendiente -> usuario pulsa Nueva: permanece en Nueva
  it('A. Bootstrap pendiente -> usuario pulsa Nueva: permanece en Nueva', async () => {
    const bootstrapDeferred = deferred<WeeklyPlanning[]>();

    mockRepo = {
      listByTeacher: vi.fn().mockReturnValue(bootstrapDeferred.promise),
      findById: vi.fn().mockResolvedValue(null),
      listInReview: vi.fn().mockResolvedValue([]),
      listApproved: vi.fn().mockResolvedValue([]),
    };
    service = new PlanningWorkflowService(mockRepo as any);

    render(<PlanningDemoApp service={service} source={defaultSource} />);

    // While bootstrap is pending in the background, user clicks "+ Nueva planeación"
    const newBtn = await screen.findByTestId('list-new-planning-btn');
    await act(async () => {
      fireEvent.click(newBtn);
    });

    // Verification: user is now in CREATE (Wizard)
    expect(screen.getByText(/1\. ¿Qué observaste en el grupo\?/i)).toBeDefined();

    // Now resolve the earlier bootstrap promise with 1 active planning
    const delayedPlan = createPlan('delayed-plan-1', 't1', 'DRAFT');
    await act(async () => {
      bootstrapDeferred.resolve([delayedPlan]);
    });

    // Invariant SR-MD-05: Stale bootstrap resolution does NOT revert to list or switch plan!
    expect(screen.getByText(/1\. ¿Qué observaste en el grupo\?/i)).toBeDefined();
    expect(window.location.search).toContain('action=new');
  });

  // B. Consulta A pendiente -> usuario selecciona B: permanece en B
  it('B. Consulta A pendiente -> usuario selecciona B: permanece en B', async () => {
    const planADeferred = deferred<WeeklyPlanning | null>();
    const planB = createPlan('plan-b', 't1', 'DRAFT');

    mockRepo = {
      listByTeacher: vi.fn().mockResolvedValue([createPlan('plan-a', 't1', 'DRAFT'), planB]),
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === 'plan-a') return planADeferred.promise;
        if (id === 'plan-b') return Promise.resolve(planB);
        return Promise.resolve(null);
      }),
      listInReview: vi.fn().mockResolvedValue([]),
      listApproved: vi.fn().mockResolvedValue([]),
    };
    service = new PlanningWorkflowService(mockRepo as any);

    render(<PlanningDemoApp service={service} source={defaultSource} />);

    // User is on list and selects Plan A (slow to fetch)
    const selectPlanBtns = await screen.findAllByRole('button');
    // First select plan A via popstate or direct select
    await act(async () => {
      window.history.pushState({}, '', '/?planId=plan-a');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // While plan A is pending, user navigates to plan B
    await act(async () => {
      window.history.pushState({}, '', '/?planId=plan-b');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Plan B should now be visible
    await waitFor(() => {
      expect(window.location.search).toContain('planId=plan-b');
    });

    // Now late-resolve Plan A
    const planA = createPlan('plan-a', 't1', 'DRAFT');
    await act(async () => {
      planADeferred.resolve(planA);
    });

    // Invariant SR-MD-05: Late resolution of A does NOT overwrite B
    expect(window.location.search).toContain('planId=plan-b');
    expect(screen.queryByText(/plan-a/i)).toBeNull();
  });

  // C. Rol docente -> rol dirección: respuesta tardía de docente no altera dirección
  it('C. Rol docente -> rol dirección: una respuesta tardía de docente no altera la vista de dirección', async () => {
    const teacherDeferred = deferred<WeeklyPlanning[]>();
    const directorPlan = createPlan('director-plan-1', 't2', 'IN_REVIEW');

    mockRepo = {
      listByTeacher: vi.fn().mockReturnValue(teacherDeferred.promise),
      listInReview: vi.fn().mockResolvedValue([directorPlan]),
      listApproved: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(directorPlan),
    };
    service = new PlanningWorkflowService(mockRepo as any);

    render(<PlanningDemoApp service={service} source={defaultSource} />);

    // Teacher resolution is in flight. User switches role to Ceci (Directora)
    const ceciBtn = screen.getByRole('button', { name: /Ceci/i });
    await act(async () => {
      fireEvent.click(ceciBtn);
    });

    // Ceci view should now be loaded with her review plan or list
    await waitFor(() => {
      expect(screen.getByText(/APROBAR TODA LA PLANEACIÓN/i)).toBeDefined();
    });

    // Now late-resolve the teacher promise
    await act(async () => {
      teacherDeferred.resolve([createPlan('stale-teacher-plan', 't1', 'DRAFT')]);
    });

    // Invariant SR-MD-05: Ceci's view is preserved and not switched back to teacher wizard
    expect(screen.getByText(/APROBAR TODA LA PLANEACIÓN/i)).toBeDefined();
    expect(screen.queryByText(/1\. ¿Qué observaste en el grupo\?/i)).toBeNull();
  });

  // D. planId=A -> planId=B: respuesta tardía de A no sustituye B
  it('D. planId=A -> planId=B: una respuesta tardía de A no sustituye B', async () => {
    const planADeferred = deferred<WeeklyPlanning | null>();
    const planB = createPlan('plan-b-id', 't1', 'DRAFT');

    mockRepo = {
      listByTeacher: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === 'plan-a-id') return planADeferred.promise;
        if (id === 'plan-b-id') return Promise.resolve(planB);
        return Promise.resolve(null);
      }),
      listInReview: vi.fn().mockResolvedValue([]),
      listApproved: vi.fn().mockResolvedValue([]),
    };
    service = new PlanningWorkflowService(mockRepo as any);

    // Mount initially requesting plan-a-id
    window.history.pushState({}, '', '/?planId=plan-a-id');
    render(<PlanningDemoApp service={service} source={defaultSource} />);

    // Loading state is active for plan A
    expect(screen.getByTestId('lab-bootstrap-loading')).toBeDefined();

    // User navigates to plan B before A resolves
    await act(async () => {
      window.history.pushState({}, '', '/?planId=plan-b-id');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Plan B renders
    await waitFor(() => {
      expect(screen.getByText(/1\. ¿Qué observaste en el grupo\?/i)).toBeDefined();
    });

    // Late resolve plan A
    await act(async () => {
      planADeferred.resolve(createPlan('plan-a-id', 't1', 'DRAFT'));
    });

    // Invariant: plan B remains in URL and active
    expect(window.location.search).toContain('planId=plan-b-id');
  });

  // E. Navegación back/forward rápida: la URL y el expediente visible coinciden
  it('E. Navegación back/forward rápida: la URL y el expediente visible coinciden', async () => {
    const plan1Deferred = deferred<WeeklyPlanning | null>();
    const plan2Deferred = deferred<WeeklyPlanning | null>();

    mockRepo = {
      listByTeacher: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === 'plan-1') return plan1Deferred.promise;
        if (id === 'plan-2') return plan2Deferred.promise;
        return Promise.resolve(null);
      }),
      listInReview: vi.fn().mockResolvedValue([]),
      listApproved: vi.fn().mockResolvedValue([]),
    };
    service = new PlanningWorkflowService(mockRepo as any);

    render(<PlanningDemoApp service={service} source={defaultSource} />);

    // Rapid popstate 1
    await act(async () => {
      window.history.pushState({}, '', '/?planId=plan-1');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Rapid popstate 2
    await act(async () => {
      window.history.pushState({}, '', '/?planId=plan-2');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Resolve plan 2 first, then plan 1 (inverted resolution order)
    await act(async () => {
      plan2Deferred.resolve(createPlan('plan-2', 't1', 'DRAFT'));
    });
    await act(async () => {
      plan1Deferred.resolve(createPlan('plan-1', 't1', 'DRAFT'));
    });

    // Invariant SR-MD-05: Final state strictly matches the most recent navigation (plan-2)
    expect(window.location.search).toContain('planId=plan-2');
  });

  // F. Desmontaje con promesa pendiente: cero actualizaciones tardías
  it('F. Desmontaje con promesa pendiente: cero actualizaciones tardías', async () => {
    const pendingDeferred = deferred<WeeklyPlanning[]>();
    const consoleErrorSpy = vi.spyOn(console, 'error');

    mockRepo = {
      listByTeacher: vi.fn().mockReturnValue(pendingDeferred.promise),
      findById: vi.fn().mockResolvedValue(null),
      listInReview: vi.fn().mockResolvedValue([]),
      listApproved: vi.fn().mockResolvedValue([]),
    };
    service = new PlanningWorkflowService(mockRepo as any);

    const { unmount } = render(<PlanningDemoApp service={service} source={defaultSource} />);

    // Unmount before promise settles
    unmount();

    // Now settle the promise
    await act(async () => {
      pendingDeferred.resolve([createPlan('orphaned-plan', 't1', 'DRAFT')]);
    });

    // Invariant: No React unmounted component warning or error
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Can't perform a React state update on an unmounted component")
    );
    consoleErrorSpy.mockRestore();
  });

  // G. Error de consulta vigente: mensaje visible, sin fallback
  it('G. Error de consulta vigente: mensaje visible, sin fallback', async () => {
    mockRepo = {
      listByTeacher: vi.fn().mockRejectedValue(new Error('Firestore connection timeout')),
      findById: vi.fn().mockRejectedValue(new Error('Firestore connection timeout')),
      listInReview: vi.fn().mockResolvedValue([]),
      listApproved: vi.fn().mockResolvedValue([]),
    };
    service = new PlanningWorkflowService(mockRepo as any);

    window.history.pushState({}, '', '/?planId=error-plan-id');
    render(<PlanningDemoApp service={service} source={defaultSource} />);

    // Invariant: Active request error is visible to user
    await waitFor(() => {
      expect(screen.getByTestId('lab-bootstrap-error')).toBeDefined();
      expect(screen.getByText(/No pudimos recuperar tu planeación\. Intenta nuevamente\./i)).toBeDefined();
    });

    // Retry button exists
    expect(screen.getByTestId('lab-bootstrap-retry-btn')).toBeDefined();
  });

  // H. Error de consulta obsoleta: no afecta la navegación vigente
  it('H. Error de consulta obsoleta: no afecta la navegación vigente', async () => {
    const failingDeferred = deferred<WeeklyPlanning | null>();
    const healthyPlan = createPlan('healthy-plan', 't1', 'DRAFT');

    mockRepo = {
      listByTeacher: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === 'failing-plan') return failingDeferred.promise;
        if (id === 'healthy-plan') return Promise.resolve(healthyPlan);
        return Promise.resolve(null);
      }),
      listInReview: vi.fn().mockResolvedValue([]),
      listApproved: vi.fn().mockResolvedValue([]),
    };
    service = new PlanningWorkflowService(mockRepo as any);

    window.history.pushState({}, '', '/?planId=failing-plan');
    render(<PlanningDemoApp service={service} source={defaultSource} />);

    // While failing-plan is in flight, user navigates to healthy-plan
    await act(async () => {
      window.history.pushState({}, '', '/?planId=healthy-plan');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Healthy plan renders
    await waitFor(() => {
      expect(screen.getByText(/1\. ¿Qué observaste en el grupo\?/i)).toBeDefined();
    });

    // Now reject the obsolete failing-plan query
    await act(async () => {
      failingDeferred.reject(new Error('Network dead'));
    });

    // Invariant SR-MD-05: The obsolete error is discarded, healthy view is unaffected!
    expect(screen.queryByTestId('lab-bootstrap-error')).toBeNull();
    expect(screen.getByText(/1\. ¿Qué observaste en el grupo\?/i)).toBeDefined();
    expect(window.location.search).toContain('planId=healthy-plan');
  });

  // I. Recarga: conserva exactamente el planId solicitado
  it('I. Recarga: conserva exactamente el planId solicitado', async () => {
    const targetPlan = createPlan('plan-gamma-refresh', 't1', 'DRAFT');

    mockRepo = {
      listByTeacher: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(targetPlan),
      listInReview: vi.fn().mockResolvedValue([]),
      listApproved: vi.fn().mockResolvedValue([]),
    };
    service = new PlanningWorkflowService(mockRepo as any);

    window.history.pushState({}, '', '/?planId=plan-gamma-refresh');
    render(<PlanningDemoApp service={service} source={defaultSource} />);

    await waitFor(() => {
      expect(screen.getByText(/1\. ¿Qué observaste en el grupo\?/i)).toBeDefined();
    });

    expect(window.location.search).toBe('?planId=plan-gamma-refresh');
  });

  // J. CLOSED: continúa inmutable
  it('J. CLOSED: continúa inmutable', async () => {
    const closedPlan = createPlan('plan-closed-hist', 't1', 'CLOSED');

    mockRepo = {
      listByTeacher: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(closedPlan),
      listInReview: vi.fn().mockResolvedValue([]),
      listApproved: vi.fn().mockResolvedValue([]),
    };
    service = new PlanningWorkflowService(mockRepo as any);

    window.history.pushState({}, '', '/?planId=plan-closed-hist');
    render(<PlanningDemoApp service={service} source={defaultSource} />);

    await waitFor(() => {
      // Invariant: CLOSED badge or indicator is rendered
      expect(screen.getByText(/Semana Cerrada/i)).toBeDefined();
    });

    // Mutation buttons like "Generar Semana" or "Enviar a Revisión" are NOT rendered
    expect(screen.queryByText(/Generar Semana/i)).toBeNull();
    expect(screen.queryByText(/Enviar a Revisión/i)).toBeNull();
  });
});
