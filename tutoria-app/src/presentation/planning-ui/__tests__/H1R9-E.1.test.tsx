import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-E.1: Supervisor Tere — Closed Week Inbox Only", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createPlan = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-h1r9-e1"
  ) => {
    const plan = WeeklyPlanning.create(id, "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs E1", "Needs E1", "Sit E1", "Mat E1");
    plan.days = recs;
    plan.observations = "Obs Grupo E1";
    plan.identifiedNeeds = "Needs Grupo E1";
    plan.specialSituations = "Sit Grupo E1";
    plan.availableMaterials = "Mat Grupo E1";
    await repo.save(plan);
    return plan;
  };

  it("A-E. Tere inbox strictly hides DRAFT, IN_REVIEW, APPROVED_FOR_EXECUTION, 4/5 approved, and 5/5 READY_FOR_CLOSURE (before explicit close)", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createPlan(repo, source);

    // A. DRAFT
    plan.status = "DRAFT";
    await repo.save(plan);
    let closedPlans = await service.listSupervisorClosedPlanning("SUPERVISOR");
    expect(closedPlans.length).toBe(0);

    // B. IN_REVIEW
    plan.status = "IN_REVIEW";
    await repo.save(plan);
    closedPlans = await service.listSupervisorClosedPlanning("SUPERVISOR");
    expect(closedPlans.length).toBe(0);

    // C. APPROVED_FOR_EXECUTION
    plan.status = "APPROVED";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repo.save(plan);
    closedPlans = await service.listSupervisorClosedPlanning("SUPERVISOR");
    expect(closedPlans.length).toBe(0);

    // D. 4/5 approved evaluations
    for (let i = 0; i < 4; i++) {
      plan.days[i].evaluation = `Eval ${i + 1}`;
      plan.days[i].evaluationStatus = "APPROVED";
    }
    await repo.save(plan);
    closedPlans = await service.listSupervisorClosedPlanning("SUPERVISOR");
    expect(closedPlans.length).toBe(0);

    // E. 5/5 approved evaluations (READY_FOR_CLOSURE but NOT CLOSED)
    plan.days[4].evaluation = "Eval 5";
    plan.days[4].evaluationStatus = "APPROVED";
    expect(plan.isReadyForClosure).toBe(true);
    await repo.save(plan);

    closedPlans = await service.listSupervisorClosedPlanning("SUPERVISOR");
    expect(closedPlans.length).toBe(0);

    // In UI, Tere sees empty state
    const { unmount } = render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-28" />);
    await act(async () => { fireEvent.click(screen.getByText("Tere (Supervisora)")); });

    expect(screen.getByText(/Aún no hay semanas cerradas para supervisión/i)).toBeDefined();
    expect(screen.queryByText("Lactantes C • Semana del 24 al 28 de agosto")).toBeNull();
    expect(screen.queryByText(/Semana cerrada/i)).toBeNull();
    unmount();
  });

  it("F-R. Ceci closes week -> Tere discovers CLOSED record with same planningId, full read-only visibility of context, 5 activities, and 5 approved evaluations without mutation controls", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createPlan(repo, source);

    plan.status = "APPROVED";
    plan.approvedBy = "Ceci";
    for (let i = 0; i < 5; i++) {
      plan.days[i].evaluation = `Evaluación final día ${i + 1}`;
      plan.days[i].evaluationStatus = "APPROVED";
      plan.days[i].evaluationReviewedBy = "Ceci";
      plan.days[i].evaluationReviewedAt = new Date("2026-08-28T17:00:00Z");
    }
    await repo.save(plan);

    // F. Ceci formally closes the week
    await service.closeWeek(plan.planningId, "DIRECTOR", "Ceci", new Date("2026-08-28T18:00:00Z"));

    // G, Q, R. Single authoritative record in repo, status CLOSED, same planningId preserved
    const allRecords = await repo.listApproved();
    expect(allRecords.length).toBe(1);
    expect(allRecords[0].planningId).toBe(plan.planningId);
    expect(allRecords[0].status).toBe("CLOSED");

    const closedForSupervisor = await service.listSupervisorClosedPlanning("SUPERVISOR");
    expect(closedForSupervisor.length).toBe(1);
    expect(closedForSupervisor[0].planningId).toBe(plan.planningId);

    // H. Tere opens UI
    render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-28" />);
    await act(async () => { fireEvent.click(screen.getByText("Tere (Supervisora)")); });

    // Card is visible
    expect(screen.getByText("Anita")).toBeDefined();
    expect(screen.getAllByText(/Semana cerrada/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Guardería IMSS Demo/i)).toBeDefined();

    // Click card to open SupervisorReview
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    // I. Weekly context is visible
    expect(screen.getByText("Obs Grupo E1")).toBeDefined();
    expect(screen.getByText("Needs Grupo E1")).toBeDefined();
    expect(screen.getByText("Sit Grupo E1")).toBeDefined();
    expect(screen.getByText("Mat Grupo E1")).toBeDefined();

    // J, K, L, M. Five days, activities, and evaluations are visible
    expect(screen.getByText("Lunes 24")).toBeDefined();
    expect(screen.getByText("Martes 25")).toBeDefined();
    expect(screen.getByText("Miércoles 26")).toBeDefined();
    expect(screen.getByText("Jueves 27")).toBeDefined();
    expect(screen.getByText("Viernes 28")).toBeDefined();

    expect(screen.getByText("Evaluación final día 1")).toBeDefined();
    expect(screen.getByText("Evaluación final día 5")).toBeDefined();
    expect(screen.getAllByText(/Evaluación aprobada/i).length).toBeGreaterThan(0);

    // N, O, P. No mutation controls exist
    expect(screen.queryByRole("button", { name: /Cerrar semana/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Aprobar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Rechazar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Guardar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Enviar/i })).toBeNull();
  });

  it("S-AA. Remount/reload preserves Tere visibility, official IMSS print view is accessible and renders Aprobada", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createPlan(repo, source);
    plan.status = "APPROVED";
    for (let i = 0; i < 5; i++) {
      plan.days[i].evaluation = `Evaluación final día ${i + 1}`;
      plan.days[i].evaluationStatus = "APPROVED";
    }
    plan.closeWeek("Ceci", new Date("2026-08-28T18:00:00Z"));
    await repo.save(plan);

    // S. Remount / reload
    const { unmount } = render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-28" />);
    await act(async () => { fireEvent.click(screen.getByText("Tere (Supervisora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    expect(screen.getAllByText(/Semana cerrada/i).length).toBeGreaterThan(0);

    // Z, AA. Direct official IMSS print view
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /VER VERSIÓN OFICIAL IMSS/i })); });
    expect(screen.getAllByText(/Planeación de Actividades Pedagógicas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Código: 3D11-009-003").length).toBeGreaterThan(0);

    unmount();
  });
});
