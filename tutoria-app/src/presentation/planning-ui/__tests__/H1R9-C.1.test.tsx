import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-C.1: Daily Evaluation Temporal Unlock", () => {
  const createApprovedPlan = async (repo: InMemoryWeeklyPlanningRepository, source: DeterministicPedagogicalRecommendationSource, id = "plan-approved") => {
    const plan = WeeklyPlanning.create(id, "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "Obs iniciales", "Necesidades grupo", "Sin novedad", "Materiales varios");
    plan.days = recs;
    plan.observations = "Obs iniciales";
    plan.identifiedNeeds = "Necesidades grupo";
    plan.specialSituations = "Sin novedad";
    plan.availableMaterials = "Materiales varios";
    plan.originalContext = {
      observations: "Obs iniciales",
      identifiedNeeds: "Necesidades grupo",
      specialSituations: "Sin novedad",
      availableMaterials: "Materiales varios"
    };
    plan.status = "APPROVED";
    plan.approvedBy = "Ceci";
    plan.approvedAt = new Date();
    await repo.save(plan);
    return plan;
  };

  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  it("01. Approved planning exposes daily evaluation section to Anita", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });

    // Enter as Anita and open approved plan
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    expect(screen.getByText(/Evaluación del día/i)).toBeDefined();
  });

  it("02. Before Monday (2026-08-23): 0/5 evaluations are editable, all 5 locked", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-23" />);
    });

    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    const days = ["Lunes 24", "Martes 25", "Miércoles 26", "Jueves 27", "Viernes 28"];
    for (const d of days) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") })); });
      expect(screen.getByText(/Bloqueado/i)).toBeDefined();
      expect(screen.getByText(/Esta evaluación aún no está disponible/i)).toBeDefined();
      expect(screen.queryByRole("button", { name: /Guardar evaluación/i })).toBeNull();
    }
  });

  it("03. On Monday 24 (2026-08-24): Monday editable, Tuesday-Friday locked", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });

    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    // Monday is editable
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeDefined();

    // Tuesday-Friday are locked
    const futureDays = [
      { name: "Martes 25", label: "Disponible el martes 25 de agosto" },
      { name: "Miércoles 26", label: "Disponible el miércoles 26 de agosto" },
      { name: "Jueves 27", label: "Disponible el jueves 27 de agosto" },
      { name: "Viernes 28", label: "Disponible el viernes 28 de agosto" }
    ];

    for (const d of futureDays) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(d.name, "i") })); });
      expect(screen.getByText(/Bloqueado/i)).toBeDefined();
      expect(screen.getByText(new RegExp(d.label, "i"))).toBeDefined();
      expect(screen.queryByRole("button", { name: /Guardar evaluación/i })).toBeNull();
    }
  });

  it("04. On Tuesday 25 (2026-08-25): with Monday completed, Tuesday is editable, Wednesday-Friday locked", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source);
    plan.days[0].evaluation = "Lunes evaluado";
    await repo.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-25" />);
    });

    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    // Monday editable
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();

    // Tuesday editable
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });
    expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();

    // Wednesday-Friday locked
    const futureDays = ["Miércoles 26", "Jueves 27", "Viernes 28"];
    for (const d of futureDays) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") })); });
      expect(screen.getByText(/Bloqueado/i)).toBeDefined();
      expect(screen.queryByRole("button", { name: /Guardar evaluación/i })).toBeNull();
    }
  });

  it("05. On Wednesday 26 (2026-08-26): with Mon-Tue completed, Wednesday is editable, Thursday-Friday locked", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source);
    plan.days[0].evaluation = "Lunes evaluado";
    plan.days[1].evaluation = "Martes evaluado";
    await repo.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-26" />);
    });

    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    for (const d of ["Lunes 24", "Martes 25", "Miércoles 26"]) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") })); });
      expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
    }

    for (const d of ["Jueves 27", "Viernes 28"]) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") })); });
      expect(screen.getByText(/Bloqueado/i)).toBeDefined();
    }
  });

  it("06. On Thursday 27 (2026-08-27): with Mon-Wed completed, Thursday is editable, Friday locked", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source);
    plan.days[0].evaluation = "Lunes evaluado";
    plan.days[1].evaluation = "Martes evaluado";
    plan.days[2].evaluation = "Miercoles evaluado";
    await repo.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-27" />);
    });

    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    for (const d of ["Lunes 24", "Martes 25", "Miércoles 26", "Jueves 27"]) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") })); });
      expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
    }

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Viernes 28/i })); });
    expect(screen.getByText(/Bloqueado/i)).toBeDefined();
  });

  it("07. On Friday 28 (2026-08-28): with Mon-Thu completed, Friday is eligible and editable", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createApprovedPlan(repo, source);
    plan.days[0].evaluation = "Lunes evaluado";
    plan.days[1].evaluation = "Martes evaluado";
    plan.days[2].evaluation = "Miercoles evaluado";
    plan.days[3].evaluation = "Jueves evaluado";
    await repo.save(plan);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-28" />);
    });

    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    for (const d of ["Lunes 24", "Martes 25", "Miércoles 26", "Jueves 27", "Viernes 28"]) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") })); });
      expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeDefined();
    }
  });

  it("08. Future-day evaluation cannot be persisted through domain/service boundary", async () => {
    const { repo, service, source } = createTestDeps();
    await createApprovedPlan(repo, source, "plan-security");

    // Attempting to evaluate Tuesday when current date is Monday 2026-08-24 throws
    await expect(
      service.saveDailyEvaluation("plan-security", "TUESDAY", "Evaluación futura no permitida", "TEACHER", "2026-08-24")
    ).rejects.toThrow(/Cannot evaluate future day/i);

    // Attempting to evaluate Friday when current date is Wednesday 2026-08-26 throws
    await expect(
      service.saveDailyEvaluation("plan-security", "FRIDAY", "Evaluación futura no permitida", "TEACHER", "2026-08-26")
    ).rejects.toThrow(/Cannot evaluate future day/i);
  });

  it("09-12. Saving Monday evaluation persists only on Monday, survives reload, activities and context remain immutable", async () => {
    const { repo, service, source } = createTestDeps();
    const originalPlan = await createApprovedPlan(repo, source, "plan-persist");
    const originalActivities = JSON.stringify(originalPlan.days[0]!.activities);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-24" />);
    });

    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    // 09. Fill Monday evaluation and save
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    const evalInput = screen.getByPlaceholderText(/El grupo respondió favorablemente a la actividad/i);
    await act(async () => {
      fireEvent.change(evalInput, {
        target: { value: "El grupo respondió favorablemente a la actividad de sonidos con sonajas." }
      });
    });

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Enviar evaluación a Ceci/i })); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    // Verify in repository
    const planInRepo = await repo.findById("plan-persist");
    expect(planInRepo!.days[0]!.evaluation).toBe("El grupo respondió favorablemente a la actividad de sonidos con sonajas.");
    expect(planInRepo!.days[1]!.evaluation || "").toBe("");
    expect(planInRepo!.days[2]!.evaluation || "").toBe("");
    expect(planInRepo!.days[3]!.evaluation || "").toBe("");
    expect(planInRepo!.days[4]!.evaluation || "").toBe("");

    // 10. Switch to Tuesday and back to Monday to verify retention in UI
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    expect(screen.getByText("El grupo respondió favorablemente a la actividad de sonidos con sonajas.")).toBeDefined();

    // 11. Activities immutability
    expect(JSON.stringify(planInRepo!.days[0]!.activities)).toBe(originalActivities);

    // 12. Weekly context remains locked/frozen
    expect(screen.queryByText(/✏️ Editar contexto semanal/i)).toBeNull();
    expect(planInRepo?.observations).toBe("Obs iniciales");
    expect(planInRepo?.identifiedNeeds).toBe("Necesidades grupo");
    expect(planInRepo?.specialSituations).toBe("Sin novedad");
    expect(planInRepo?.availableMaterials).toBe("Materiales varios");
  });
});
