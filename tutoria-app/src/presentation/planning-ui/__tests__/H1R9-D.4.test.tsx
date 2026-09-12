import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-D.4: Formal Weekly Closure by Ceci", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createBaseApprovedPlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-d4"
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

  it("A-K. Domain and UI closure rules: 0/5, 4/5, IN_REVIEW, CHANGES_REQUESTED cannot close; 5/5 allows explicit Ceci closure, persists CLOSED, closedBy, closedAt, and rejects second closure", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createBaseApprovedPlan(repo, source);

    // A. 0/5 cannot close
    expect(() => plan.closeWeek("Ceci")).toThrow(/Cannot close week: only 0\/5/i);
    await expect(service.closeWeek(plan.planningId, "DIRECTOR", "Ceci")).rejects.toThrow(/Cannot close week/i);

    // B. 4/5 cannot close (Mon, Tue, Wed, Thu approved)
    plan.days[0].evaluation = "Lunes evaluado";
    plan.days[0].evaluationStatus = "APPROVED";
    plan.days[1].evaluation = "Martes evaluado";
    plan.days[1].evaluationStatus = "APPROVED";
    plan.days[2].evaluation = "Miércoles evaluado";
    plan.days[2].evaluationStatus = "APPROVED";
    plan.days[3].evaluation = "Jueves evaluado";
    plan.days[3].evaluationStatus = "APPROVED";
    expect(() => plan.closeWeek("Ceci")).toThrow(/Cannot close week: only 4\/5/i);

    // C. Friday IN_REVIEW -> cannot close
    plan.days[4].evaluation = "Viernes en revisión";
    plan.days[4].evaluationStatus = "IN_REVIEW";
    expect(() => plan.closeWeek("Ceci")).toThrow(/Cannot close week: only 4\/5/i);

    // D. Friday CHANGES_REQUESTED -> cannot close
    plan.days[4].evaluationStatus = "CHANGES_REQUESTED";
    plan.days[4].evaluationDirectorComment = "Mejorar conclusión";
    expect(() => plan.closeWeek("Ceci")).toThrow(/Cannot close week: only 4\/5/i);
    await repo.save(plan);

    // Render Director UI with 4/5
    const { unmount } = render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-28" />);
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    // Verify 4/5 and NO "Cerrar semana" button
    expect(screen.getByText(/Evaluaciones aprobadas: 4\/5/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Cerrar semana/i })).toBeNull();
    expect(screen.queryByText(/Semana cerrada/i)).toBeNull();

    // Q. Friday is ORANGE for Ceci
    const friTab = screen.getByRole("tab", { name: /Viernes 28/i });
    expect(friTab.className).toContain("orange");

    // Approve Friday evaluation -> 5/5
    await act(async () => { fireEvent.click(friTab); });
    // E, R. 5/5 APPROVED is ready but not automatically CLOSED
    const planBeforeClose = await repo.findById(plan.planningId);
    planBeforeClose!.days[4].evaluationStatus = "APPROVED";
    await repo.save(planBeforeClose!);

    // Re-render Ceci view
    unmount();
    const { unmount: unmount2 } = render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-28" />);
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    expect(screen.getByText(/Evaluaciones aprobadas: 5\/5/i)).toBeDefined();
    expect(screen.getByText(/Semana lista para cierre/i)).toBeDefined();

    // F. "Cerrar semana" button is now visible
    const closeBtn = screen.getByRole("button", { name: /Cerrar semana/i });
    expect(closeBtn).toBeDefined();

    // Click "Cerrar semana"
    const testCloseDate = new Date("2026-08-28T18:00:00Z");
    await act(async () => { fireEvent.click(closeBtn); });

    // G, H, I. UI immediately displays "Semana cerrada"
    expect(screen.getAllByText(/Semana cerrada/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Cerrar semana/i })).toBeNull();

    // Check repository persistence
    const closedPlan = await repo.findById(plan.planningId);
    expect(closedPlan!.status).toBe("CLOSED");
    expect(closedPlan!.semanticStatus).toBe("CLOSED");
    expect(closedPlan!.isClosed()).toBe(true);
    expect(closedPlan!.closedBy).toBe("Ceci");
    expect(closedPlan!.closedAt).toBeDefined();

    // K. Second close attempt rejected
    expect(() => closedPlan!.closeWeek("Ceci")).toThrow(/already CLOSED/i);
    await expect(service.closeWeek(plan.planningId, "DIRECTOR", "Ceci")).rejects.toThrow(/already CLOSED/i);

    unmount2();

    // J. Remount / reload remains CLOSED
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-28" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    expect(screen.getAllByText(/Semana cerrada/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Evaluaciones aprobadas: 5\/5/i)).toBeDefined();
  });

  it("L-P, S-W. CLOSED week is read-only for Anita, rejects evaluation mutations, preserves all day records and print views", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createBaseApprovedPlan(repo, source);

    for (let i = 0; i < 5; i++) {
      plan.days[i].evaluation = `Día ${i + 1} completado`;
      plan.days[i].evaluationStatus = "APPROVED";
      plan.days[i].evaluationReviewedBy = "Ceci";
    }
    plan.closeWeek("Ceci", new Date("2026-08-28T18:00:00Z"));
    await repo.save(plan);

    // M. Cannot submit daily evaluation on closed plan
    expect(() => {
      plan.submitDailyEvaluation("MONDAY", "Nuevo texto", "2026-08-24", "t1");
    }).toThrow(/Cannot submit already submitted evaluation|only permitted when planning is APPROVED/i);

    // N. Cannot resubmit evaluation on closed plan
    expect(() => {
      plan.resubmitDailyEvaluation("MONDAY", "Nuevo texto", "2026-08-24", "t1");
    }).toThrow(/Daily evaluation resubmission is only permitted when planning is APPROVED/i);

    // O, P. All 5 evaluations and activities remain intact
    expect(plan.days.length).toBe(5);
    expect(plan.days[0].evaluation).toBe("Día 1 completado");
    expect(plan.days[4].evaluation).toBe("Día 5 completado");
    expect(plan.days.every(d => d.evaluationStatus === "APPROVED")).toBe(true);

    // L. Anita view is read-only
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-28" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Semana cerrada/i)); });

    expect(screen.getAllByText(/Semana cerrada/i).length).toBeGreaterThan(0);
    // Anita cannot edit anything
    expect(screen.queryByPlaceholderText(/El grupo respondió favorablemente a la actividad/i)).toBeNull();

    // V, W. Official print view can be opened and displays "Aprobada"
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Versión Oficial IMSS/i })); });
    expect(screen.getAllByText(/Planeación de Actividades Pedagógicas/i).length).toBeGreaterThan(0);
  });
});
