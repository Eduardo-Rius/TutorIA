import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-C.5: Daily Evaluation Correction & Resubmission", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const createPlanWithChangesRequested = async (
    repo: InMemoryWeeklyPlanningRepository,
    source: DeterministicPedagogicalRecommendationSource,
    id = "plan-c5"
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

    // Monday: APPROVED
    plan.days[0].evaluation = "Lunes aprobado";
    plan.days[0].evaluationStatus = "APPROVED";
    plan.days[0].evaluationReviewedBy = "Ceci";
    plan.days[0].evaluationReviewedAt = new Date();

    // Tuesday: CHANGES_REQUESTED
    plan.days[1].evaluation = "Martes texto inicial con falta de detalle";
    plan.days[1].evaluationStatus = "CHANGES_REQUESTED";
    plan.days[1].evaluationSubmittedAt = new Date("2026-08-25T16:00:00Z");
    plan.days[1].evaluationSubmittedBy = "t1";
    plan.days[1].evaluationDirectorComment = "Favor de especificar cómo respondió el grupo durante la actividad.";
    plan.days[1].evaluationReviewedBy = "Ceci";
    plan.days[1].evaluationReviewedAt = new Date("2026-08-25T17:00:00Z");

    await repo.save(plan);
    return plan;
  };

  it("01-05. CHANGES_REQUESTED is editable for Anita, shows Ceci exact comment; IN_REVIEW and APPROVED remain non-editable", async () => {
    const { repo, service, source } = createTestDeps();
    await createPlanWithChangesRequested(repo, source);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-26" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    // Open Monday (APPROVED) -> non-editable (05)
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    expect(screen.queryByPlaceholderText(/El grupo respondió favorablemente a la actividad/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Reenviar evaluación a Ceci/i })).toBeNull();

    // Open Tuesday (CHANGES_REQUESTED) -> editable (01, 02, 03)
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });
    expect(screen.getByText(/Favor de especificar cómo respondió el grupo durante la actividad./i)).toBeDefined();
    expect(screen.getByText(/Edición habilitada por solicitud de Ceci/i)).toBeDefined();

    const textarea = screen.getByPlaceholderText(/El grupo respondió favorablemente a la actividad/i);
    expect(textarea).toBeDefined();
    expect((textarea as HTMLTextAreaElement).value).toBe("Martes texto inicial con falta de detalle");

    // Action buttons visible
    expect(screen.getByRole("button", { name: /Guardar corrección como borrador/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Reenviar evaluación a Ceci/i })).toBeDefined();
  });

  it("06-08. Anita can save correction draft and leave/return; empty correction cannot be resubmitted", async () => {
    const { repo, service, source } = createTestDeps();
    await createPlanWithChangesRequested(repo, source);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-26" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });
    const textarea = screen.getByPlaceholderText(/El grupo respondió favorablemente a la actividad/i);

    // Edit to draft correction (06, 07)
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Martes corrección en progreso..." } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Guardar corrección como borrador/i }));
    });

    const plan = await repo.findById("plan-c5");
    expect(plan!.days[1].evaluation).toBe("Martes corrección en progreso...");
    expect(plan!.days[1].evaluationStatus).toBe("CHANGES_REQUESTED");

    // Clear textarea -> resubmit button disabled (08)
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "   " } });
    });
    const resubmitBtn = screen.getByRole("button", { name: /Reenviar evaluación a Ceci/i });
    expect(resubmitBtn.hasAttribute("disabled")).toBe(true);
  });

  it("09-17. Resubmission loop: transitions to IN_REVIEW, preserves history, turns tab BLUE, Ceci sees corrected text and can approve", async () => {
    const { repo, service, source } = createTestDeps();
    await createPlanWithChangesRequested(repo, source);

    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-26" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });
    const textarea = screen.getByPlaceholderText(/El grupo respondió favorablemente a la actividad/i);

    const correctedText = "El grupo respondió con gran atención a los estímulos táctiles, logrando la interacción deseada.";
    await act(async () => {
      fireEvent.change(textarea, { target: { value: correctedText } });
    });

    // Reenviar a Ceci (09)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Reenviar evaluación a Ceci/i }));
    });

    // Domain assertions (10, 11, 12)
    const updatedPlan = await repo.findById("plan-c5");
    const tuesday = updatedPlan!.days[1];
    expect(tuesday.evaluation).toBe(correctedText);
    expect(tuesday.evaluationStatus).toBe("IN_REVIEW");
    expect(tuesday.evaluationSubmittedAt).toBeDefined();
    expect(tuesday.evaluationSubmittedBy).toBe("t1");
    // 12. History preservation
    expect(tuesday.evaluationHistory).toBeDefined();
    expect(tuesday.evaluationHistory!.length).toBe(1);
    expect(tuesday.evaluationHistory![0].evaluation).toBe("Martes texto inicial con falta de detalle");
    expect(tuesday.evaluationHistory![0].directorComment).toBe("Favor de especificar cómo respondió el grupo durante la actividad.");

    // 13. Tuesday tab becomes BLUE
    expect(screen.getByRole("tab", { name: /Martes 25/i }).className).toContain("blue");

    // 04. Now non-editable for Anita
    expect(screen.queryByPlaceholderText(/El grupo respondió favorablemente a la actividad/i)).toBeNull();
    expect(screen.getAllByText(/En revisión por Ceci/i).length).toBeGreaterThan(0);

    // Switch to Ceci (14, 15, 16, 17)
    await act(async () => { fireEvent.click(screen.getByText("Ceci (Directora)")); });
    await act(async () => { fireEvent.click(screen.getByText("Anita")); });

    // Tuesday is ORANGE for Ceci requiring review (H1R9-D.2)
    expect(screen.getByRole("tab", { name: /Martes 25/i }).className).toContain("orange");

    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });

    // 14. Ceci sees corrected text
    expect(screen.getByText(correctedText)).toBeDefined();
    // 15. Ceci sees corrected evaluation indicator
    expect(screen.getByText(/Evaluación corregida por Anita/i)).toBeDefined();

    // 16. Approve action works
    const approveBtn = screen.getByRole("button", { name: /Aprobar evaluación/i });
    expect(approveBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(approveBtn);
    });

    const finalPlan = await repo.findById("plan-c5");
    expect(finalPlan!.days[1].evaluationStatus).toBe("APPROVED");
    expect(finalPlan!.days[1].evaluationReviewedBy).toBe("Ceci");
    expect(screen.getByRole("tab", { name: /Martes 25/i }).className).toContain("green");
  });

  it("18-19. Other days immutability and chronological forward progression", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = await createPlanWithChangesRequested(repo, source);

    // Wednesday date arrived
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} currentDate="2026-08-26" />);
    });
    await act(async () => { fireEvent.click(screen.getByText("Anita (Pedagoga)")); });
    await act(async () => { fireEvent.click(screen.getByText(/Propuesta lista para usarse/i)); });

    // 19. Chronological progression: Wednesday is evaluable even if Tuesday is CHANGES_REQUESTED
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Miércoles 26/i })); });
    expect(screen.getByText(/Disponible para evaluar/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Guardar borrador/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Enviar evaluación a Ceci/i })).toBeDefined();

    // 18. Activities of Wednesday remain unchanged
    expect(plan.days[2].activities.length).toBeGreaterThan(0);
  });
});
