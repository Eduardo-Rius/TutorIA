import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-C.3.1: Remove Redundant Guardar Evaluación Action", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createApprovedPlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-1"
  ) => {
    const plan = WeeklyPlanning.create(id, "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs", "Needs", "Sit", "Mat");
    plan.days = recs;
    plan.observations = "Obs Original";
    plan.identifiedNeeds = "Needs Original";
    plan.specialSituations = "Sit Original";
    plan.availableMaterials = "Mat Original";
    plan.status = "APPROVED";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repo.save(plan);
    return plan;
  };

  it("01-03. UI exposes ONLY Guardar borrador and Enviar evaluación a Ceci (Guardar evaluación is strictly removed)", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source, "plan-1");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });

    // 1. Guardar borrador is visible
    expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeDefined();

    // 2. Guardar evaluación is NOT visible
    expect(screen.queryByRole("button", { name: /^💾?s*Guardar evaluación$/i })).toBeNull();
    expect(screen.queryByText(/^💾?s*Guardar evaluación$/i)).toBeNull();

    // 3. Enviar evaluación a Ceci is visible
    expect(screen.getByRole("button", { name: /Enviar evaluación a Ceci/i })).toBeDefined();
  });

  it("04-06. Draft workflow: saving draft keeps DRAFT, keeps editor open, does not unlock next day", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source, "plan-1");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-25" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    const textarea = screen.getByPlaceholderText(/El grupo respondió favorablemente a la actividad/i);

    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Borrador de lunes en progreso" } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Guardar borrador/i }));
    });

    // 4. Saved draft has DRAFT status
    const plan = await repo.findById("plan-1");
    expect(plan!.days[0]!.evaluation).toBe("Borrador de lunes en progreso");
    expect(plan!.days[0]!.evaluationStatus).toBe("DRAFT");

    // 5. Editor remains open and editable
    expect(screen.getByDisplayValue("Borrador de lunes en progreso")).toBeDefined();
    expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeDefined();

    // 6. Next day (Tuesday) remains blocked because Monday is only DRAFT
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });
    expect(screen.getByText(/Evaluación bloqueada por orden cronológico/i)).toBeDefined();
    expect(screen.getByText(/Completa primero la evaluación de Lunes/i)).toBeDefined();
  });

  it("07-10. Formal submit workflow: transitions to IN_REVIEW, freezes for Anita, unlocks Tuesday (on Aug 25)", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source, "plan-1");

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-25" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    const textarea = screen.getByPlaceholderText(/El grupo respondió favorablemente a la actividad/i);

    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Evaluación definitiva de lunes enviada a Ceci" } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Enviar evaluación a Ceci/i }));
    });

    // 7. Domain is IN_REVIEW
    const plan = await repo.findById("plan-1");
    expect(plan!.days[0]!.evaluation).toBe("Evaluación definitiva de lunes enviada a Ceci");
    expect(plan!.days[0]!.evaluationStatus).toBe("IN_REVIEW");
    expect(plan!.days[0]!.evaluationSubmittedAt).toBeDefined();
    expect(plan!.days[0]!.evaluationSubmittedBy).toBe("t1");

    // 8. Freeze: read-only for Anita
    expect(screen.getAllByText(/En revisión por Ceci/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Guardar borrador/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Enviar evaluación a Ceci/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^💾?s*Guardar evaluación$/i })).toBeNull();

    // 9. Unlocks Tuesday because Monday is submitted and Tuesday (Aug 25) date arrived
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });
    expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Enviar evaluación a Ceci/i })).toBeDefined();

    // 10. Future day protection: Wednesday (Aug 26) remains locked on Aug 25
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Miércoles 26/i })); });
    expect(screen.getByText(/Esta evaluación aún no está disponible/i)).toBeDefined();
  });
});
