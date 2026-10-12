import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";
import { PlanningDemoApp } from "../PlanningDemoApp";

describe("SR-MD-19 — Circuito Completo de Devolución de Planeación (Ceci ↔ Anita)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== "undefined" && window.history) {
      window.history.replaceState({}, "", "/");
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== "undefined" && window.history) {
      window.history.replaceState({}, "", "/");
    }
  });

  const setupTestEnvironment = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  it("1. Ceci prepara observaciones y devuelve la planeación a Anita sin errores de red remotos", async () => {
    const { repo, service, source } = setupTestEnvironment();

    // Anita crea y envía planeación
    const plan = WeeklyPlanning.create("plan-sr19-1", "00000000-0000-4000-8000-000000000001", "room-lactantes-a", "lab-teacher-anita", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs inicial", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    // Spy on service.reject to verify atomic execution
    const rejectSpy = vi.spyOn(service, "reject");

    // Render app as Ceci (DIRECTOR)
    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          role="DIRECTOR"
        />
      );
    });

    // When there is 1 pending plan, resolveDirectorReviewSession routes directly to DirectorReview
    // Expand first activity to add observation
    const reviewActBtn = screen.getAllByText("Revisar")[0]!;
    await act(async () => {
      fireEvent.click(reviewActBtn);
    });

    // Enter observation
    const textarea = screen.getByPlaceholderText(/¿Qué sugerencia tienes sobre esta actividad\?/i);
    fireEvent.change(textarea, { target: { value: "Ajustar materiales para que sean lavables." } });

    // Click "Guardar observación" (local only)
    const saveObsBtn = screen.getByText("Guardar observación");
    await act(async () => {
      fireEvent.click(saveObsBtn);
    });

    // Sticky summary should show 1 observation prepared
    expect(screen.getByText(/1 observaciones preparadas/i)).toBeTruthy();

    // Click "ENVIAR OBSERVACIONES A LA EDUCADORA"
    const sendBtn = screen.getAllByText(/ENVIAR OBSERVACIONES A LA EDUCADORA/i)[0]!;
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    // Verify service.reject was called atomically with the observation
    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledTimes(1);
    });

    const callArgs = rejectSpy.mock.calls[0]!;
    expect(callArgs[0]).toBe("plan-sr19-1");
    expect(callArgs[3]).toBe("DIRECTOR");
    expect(callArgs[4]!.length).toBe(1);
    expect(callArgs[4]![0].observation).toBe("Ajustar materiales para que sean lavables.");

    // Check updated plan state in repo
    const updatedPlan = await repo.findById("plan-sr19-1");
    expect(updatedPlan).not.toBeNull();
    expect(updatedPlan!.status).toBe("REJECTED");
    expect(updatedPlan!.granularObservations.length).toBe(1);
    expect(updatedPlan!.granularObservations[0]!.status).toBe("PENDING_CORRECTION");
  });

  it("2. Anita recibe observaciones, atiende corrección y reenvía a Ceci (REJECTED -> IN_REVIEW)", async () => {
    const { repo, service, source } = setupTestEnvironment();

    // Setup a plan in REJECTED status with 1 granular observation on Monday's first activity
    const plan = WeeklyPlanning.create("plan-sr19-2", "00000000-0000-4000-8000-000000000001", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.status = "IN_REVIEW";
    const targetActivity = recs[0]!.activities[0]!;

    plan.reject("Ajustar materiales", "Ceci", [
      {
        targetId: targetActivity.activityId,
        observation: "Usar libros de tela",
        originalContent: targetActivity.description,
        currentContent: targetActivity.description,
        status: "PENDING_CORRECTION",
        reviewer: "Ceci",
        timestamp: new Date(),
      },
    ]);
    await repo.save(plan);

    // Render as Anita
    await act(async () => {
      render(
        <PlanningDemoApp
          service={service}
          source={source}
          role="TEACHER"
        />
      );
    });

    // When there is 1 active plan, resolveTeacherPlanningSession routes directly to TeacherWizard
    // Check required correction tab indicator (Monday has orange dot)
    expect(screen.getByRole("tab", { name: /🟠 Lunes 24/i })).toBeTruthy();

    // Click Revisar / Editar to expand the activity
    await act(async () => {
      fireEvent.click(screen.getAllByText("Revisar / Editar")[0]!);
    });

    // Edit activity description
    const textareas = screen.getAllByDisplayValue(targetActivity.description);
    fireEvent.change(textareas[0]!, { target: { value: "Lectura con libros de tela lavables." } });
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // Mark day reviewed after correction
    await act(async () => {
      fireEvent.click(screen.getByText("✓ Marcar día como revisado"));
    });

    // Submit button should now be enabled and say "Enviar correcciones a la Directora"
    const submitBtn = screen.getByText("Enviar correcciones a la Directora");
    expect((submitBtn.closest("button") as HTMLButtonElement).disabled).toBe(false);

    // Resubmit to director
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Verify repo state: plan is now IN_REVIEW
    await waitFor(async () => {
      const resubmittedPlan = await repo.findById("plan-sr19-2");
      expect(resubmittedPlan!.status).toBe("IN_REVIEW");
    });
  });

  it("3. Transición completa: Ceci revisa la corrección y aprueba la planeación", async () => {
    const { repo, service, source } = setupTestEnvironment();

    // Setup plan resubmitted in IN_REVIEW with 1 CHANGED_BY_EDUCATOR observation
    const plan = WeeklyPlanning.create("plan-sr19-3", "00000000-0000-4000-8000-000000000001", "room-lactantes-a", "lab-teacher-anita", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    const targetActivity = recs[0]!.activities[0]!;

    plan.granularObservations = [
      {
        targetId: targetActivity.activityId,
        observation: "Usar libros de tela",
        originalContent: "Original",
        currentContent: "Lectura con libros de tela lavables.",
        status: "CHANGED_BY_EDUCATOR",
        reviewer: "Ceci",
        timestamp: new Date(),
      },
    ];
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    // Ceci resolves the observation
    await service.resolveGranularObservation("plan-sr19-3", targetActivity.activityId, "DIRECTOR", "Ceci");

    const planAfterResolve = await repo.findById("plan-sr19-3");
    expect(planAfterResolve!.granularObservations[0]!.status).toBe("RESOLVED");

    // Ceci approves the planning
    await service.approve("plan-sr19-3", "DIRECTOR", "Ceci");

    const approvedPlan = await repo.findById("plan-sr19-3");
    expect(approvedPlan!.status).toBe("APPROVED");
    expect(approvedPlan!.approvedBy).toBe("Ceci");
  });
});
