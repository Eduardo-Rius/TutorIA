import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-D.4.1: Closed Week — Full Read-Only Visibility for Anita", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createBaseClosedPlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-closed-anita"
  ) => {
    const plan = WeeklyPlanning.create(id, "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs Contexto", "Needs Contexto", "Sit Contexto", "Mat Contexto");
    plan.days = recs;
    plan.observations = "Observaciones originales del grupo";
    plan.identifiedNeeds = "Necesidades identificadas del grupo";
    plan.specialSituations = "Situaciones especiales a considerar";
    plan.availableMaterials = "Materiales disponibles en sala";
    plan.status = "APPROVED";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date("2026-08-23T12:00:00Z");

    const evalTexts = [
      "Evaluación final del lunes completada con éxito.",
      "Evaluación final del martes con excelente respuesta.",
      "Evaluación final del miércoles corregida y aprobada.",
      "Evaluación final del jueves con alta participación.",
      "Evaluación final del viernes cierre semanal exitoso."
    ];

    for (let i = 0; i < 5; i++) {
      plan.days[i].evaluation = evalTexts[i];
      plan.days[i].evaluationStatus = "APPROVED";
      plan.days[i].evaluationReviewedBy = "Ceci";
      plan.days[i].evaluationReviewedAt = new Date("2026-08-28T17:00:00Z");
    }

    plan.closeWeek("Ceci", new Date("2026-08-28T18:00:00Z"));
    await repo.save(plan);
    return { plan, evalTexts };
  };

  it("A-Q. Anita opens CLOSED week and sees full read-only visibility of context, activities, and 5/5 approved evaluations without mutation controls", async () => {
    const { repo, service, source } = createTestDeps();
    const { plan, evalTexts } = await createBaseClosedPlan(repo, source);

    // C. Anita opens the CLOSED week
    render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-28" />);
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });

    // Dashboard shows closed week
    expect(screen.getByText(/Semana cerrada ✓/i)).toBeDefined();
    await act(async () => { fireEvent.click(screen.getByText(/Semana cerrada ✓/i)); });

    // D. Anita sees "Semana cerrada"
    expect(screen.getAllByText(/Semana cerrada/i).length).toBeGreaterThan(0);

    // L. Weekly context remains visible
    expect(screen.getByDisplayValue("Observaciones originales del grupo")).toBeDefined();
    expect(screen.getByDisplayValue("Necesidades identificadas del grupo")).toBeDefined();
    expect(screen.getByDisplayValue("Situaciones especiales a considerar")).toBeDefined();
    expect(screen.getByDisplayValue("Materiales disponibles en sala")).toBeDefined();

    // O. No weekly-context edit control is available
    expect(screen.queryByText(/Editar contexto semanal/i)).toBeNull();
    expect(screen.queryByText(/Guardar contexto semanal/i)).toBeNull();

    // E, F, G-K, M. Navigate all five weekdays and verify activities and evaluation text
    const dayTabs = [
      { name: /Lunes 24/i, evalText: evalTexts[0] },
      { name: /Martes 25/i, evalText: evalTexts[1] },
      { name: /Miércoles 26/i, evalText: evalTexts[2] },
      { name: /Jueves 27/i, evalText: evalTexts[3] },
      { name: /Viernes 28/i, evalText: evalTexts[4] },
    ];

    for (let i = 0; i < dayTabs.length; i++) {
      const tab = screen.getByRole("tab", { name: dayTabs[i].name });
      await act(async () => { fireEvent.click(tab); });

      // Tab shows green indicator
      expect(tab.className).toContain("green");

      // Evaluation badge shows approved
      expect(screen.getAllByText(/Aprobada por Ceci/i).length).toBeGreaterThan(0);

      // Final evaluation text is visible
      expect(screen.getByText(dayTabs[i].evalText)).toBeDefined();

      // Planned activities are visible
      expect(screen.getByText(plan.days[i].activities[0].objective)).toBeDefined();
    }

    // N, P. No evaluation mutation controls are available
    expect(screen.queryByText(/Guardar borrador/i)).toBeNull();
    expect(screen.queryByText(/Guardar evaluación/i)).toBeNull();
    expect(screen.queryByText(/Enviar evaluación a Ceci/i)).toBeNull();
    expect(screen.queryByText(/Reenviar evaluación a Ceci/i)).toBeNull();
    expect(screen.queryByText(/Guardar corrección como borrador/i)).toBeNull();

    // Q. The underlying evaluation text in domain/repo is unchanged
    const repoPlan = await repo.findById(plan.planningId);
    expect(repoPlan!.status).toBe("CLOSED");
    for (let i = 0; i < 5; i++) {
      expect(repoPlan!.days[i].evaluation).toBe(evalTexts[i]);
      expect(repoPlan!.days[i].evaluationStatus).toBe("APPROVED");
    }
  });

  it("R-X. Reload/remount preserves read-only visibility, Ceci CLOSED view remains consistent, official print views render Aprobada", async () => {
    const { repo, service, source } = createTestDeps();
    const { plan, evalTexts } = await createBaseClosedPlan(repo, source);

    // R. Remount / reload for Anita
    const { unmount } = render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-28" />);
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Semana cerrada ✓/i)); });

    expect(screen.getAllByText(/Semana cerrada/i).length).toBeGreaterThan(0);
    expect(screen.getByText(evalTexts[0])).toBeDefined();

    // W. Direct official IMSS print view
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Versión Oficial IMSS/i })); });
    expect(screen.getAllByText("Aprobada").length).toBeGreaterThan(0);
    expect(screen.getByText("Código: 3D11-009-003")).toBeDefined();

    // Back to dashboard
    await act(async () => { fireEvent.click(screen.getByText(/Volver/i)); });

    unmount();

    // S. Ceci CLOSED regression remains PASS
    render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-28" />);
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    expect(screen.getAllByText(/Semana cerrada/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Evaluaciones aprobadas: 5\/5/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Cerrar semana/i })).toBeNull();
  });
});
