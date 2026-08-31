import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-B.1: Weekly Context Edit & Traceability (Bullet 1)", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const renderApp = async (service: PlanningWorkflowService, source: DeterministicPedagogicalRecommendationSource, role: "TEACHER"|"DIRECTOR"|"SUPERVISOR" = "TEACHER", startNew: boolean = true) => {
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });
    await act(async () => {
      if (role === "TEACHER") {
        fireEvent.click(screen.getByText("Anita (Pedagoga)"));
        if (startNew) fireEvent.click(screen.getByText("✨ Comenzar nuestra semana"));
      } else if (role === "DIRECTOR") {
        fireEvent.click(screen.getByText("Ceci (Directora)"));
      } else if (role === "SUPERVISOR") {
        fireEvent.click(screen.getByText("Tere (Supervisora)"));
      }
    });
  };

  it("01-06. Weekly context locked by default, unlock with Editar contexto semanal, only 4 fields editable, no regeneration, no activity loss, saving locks again", async () => {
    const { service, source } = createTestDeps();
    const genSpy = vi.spyOn(source, "generateRecommendation");
    await renderApp(service, source, "TEACHER");

    // Fill initial context
    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i) as HTMLTextAreaElement;
    const needsInput = screen.getByPlaceholderText(/Control postural, atención conjunta/i) as HTMLTextAreaElement;
    const specInput = screen.getByPlaceholderText(/Dos niños nuevos en adaptación/i) as HTMLTextAreaElement;
    const matInput = screen.getByPlaceholderText(/Sonajas, colchonetas/i) as HTMLTextAreaElement;

    fireEvent.change(obsInput, { target: { value: "Contexto Original Obs" } });
    fireEvent.change(needsInput, { target: { value: "Contexto Original Necesidades" } });
    fireEvent.change(specInput, { target: { value: "Contexto Original Especial" } });
    fireEvent.change(matInput, { target: { value: "Contexto Original Materiales" } });

    // Generate week
    await act(async () => { fireEvent.click(screen.getByText(/Generar Semana/i)); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    // 1. Weekly context is locked by default after generation
    expect(obsInput).toHaveProperty("disabled", true);
    expect(needsInput).toHaveProperty("disabled", true);
    expect(specInput).toHaveProperty("disabled", true);
    expect(matInput).toHaveProperty("disabled", true);
    expect(screen.getByText(/Editar contexto semanal/i)).toBeDefined();

    // 2 & 3. Unlock with "Editar contexto semanal" - only the 4 fields become editable
    const editBtn = screen.getByText(/Editar contexto semanal/i);
    await act(async () => { fireEvent.click(editBtn); });

    expect(obsInput).not.toHaveProperty("disabled", true);
    expect(needsInput).not.toHaveProperty("disabled", true);
    expect(specInput).not.toHaveProperty("disabled", true);
    expect(matInput).not.toHaveProperty("disabled", true);

    // 4. Editing context does NOT regenerate the week
    fireEvent.change(obsInput, { target: { value: "Contexto Modificado Obs" } });
    expect(genSpy).toHaveBeenCalledTimes(1); // Generation called exactly once at initial generation

    // 5. Editing context does NOT change activities
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    expect(screen.getByText("Explorar sonidos con instrumentos de percusión simples")).toBeDefined();

    // 6. Saving locks the context again
    const saveContextBtn = screen.getByText(/Guardar contexto semanal/i);
    await act(async () => { fireEvent.click(saveContextBtn); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    expect(obsInput).toHaveProperty("disabled", true);
    expect(needsInput).toHaveProperty("disabled", true);
    expect(specInput).toHaveProperty("disabled", true);
    expect(matInput).toHaveProperty("disabled", true);
    expect(screen.getByText(/Editar contexto semanal/i)).toBeDefined();
  });

  it("07-11. Original snapshot preserved, updated context visible to Anita, Ceci sees CONTEXTO SEMANAL MODIFICADO with ANTES / AHORA only for changed fields", async () => {
    const { repo, service, source } = createTestDeps();

    // Create a plan in repo with original context
    const plan = WeeklyPlanning.create("plan-ctx-1", "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "", "", "", "");
    plan.days = recs;
    plan.observations = "Obs Original";
    plan.identifiedNeeds = "Necesidades Original";
    plan.specialSituations = "Situaciones Original";
    plan.availableMaterials = "Materiales Original";
    plan.originalContext = {
      observations: "Obs Original",
      identifiedNeeds: "Necesidades Original",
      specialSituations: "Situaciones Original",
      availableMaterials: "Materiales Original"
    };

    // Teacher modifies only 2 fields: observations and availableMaterials (leaves identifiedNeeds and specialSituations untouched)
    plan.observations = "Obs Actualizada y Modificada";
    plan.availableMaterials = "Materiales Actualizados";
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    // 7 & 8. Verify domain snapshot truth and updated values
    const savedPlan = await repo.findById("plan-ctx-1");
    expect(savedPlan?.originalContext?.observations).toBe("Obs Original");
    expect(savedPlan?.observations).toBe("Obs Actualizada y Modificada");
    expect(savedPlan?.originalContext?.identifiedNeeds).toBe("Necesidades Original");
    expect(savedPlan?.identifiedNeeds).toBe("Necesidades Original");
    expect(savedPlan?.hasContextChanged()).toBe(true);

    // Render Ceci (Director) view
    await renderApp(service, source, "DIRECTOR");
    await act(async () => { fireEvent.click(screen.getByText(/Lista para conversar/i)); });

    // 9. Ceci sees "CONTEXTO SEMANAL MODIFICADO"
    expect(screen.getByText(/CONTEXTO SEMANAL MODIFICADO/i)).toBeDefined();

    // 10. Ceci sees ANTES and AHORA for the modified fields
    expect(screen.getByText("Obs Original")).toBeDefined();
    expect(screen.getByText("Obs Actualizada y Modificada")).toBeDefined();
    expect(screen.getByText("Materiales Original")).toBeDefined();
    expect(screen.getByText("Materiales Actualizados")).toBeDefined();

    const antesLabels = screen.getAllByText(/ANTES:/i);
    const ahoraLabels = screen.getAllByText(/AHORA:/i);
    // Exactly 2 fields were changed, so exactly 2 ANTES and 2 AHORA labels appear
    expect(antesLabels.length).toBe(2);
    expect(ahoraLabels.length).toBe(2);

    // 11. Unchanged fields are not falsely marked as changed
    // "Necesidades Original" and "Situaciones Original" appear in neutral view
    expect(screen.getByText("Necesidades Original")).toBeDefined();
    expect(screen.getByText("Situaciones Original")).toBeDefined();
  });

  it("11b. Unchanged plan does NOT show CONTEXTO SEMANAL MODIFICADO to Ceci", async () => {
    const { repo, service, source } = createTestDeps();

    const plan = WeeklyPlanning.create("plan-ctx-unmodified", "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "", "", "", "");
    plan.days = recs;
    plan.observations = "Obs Identica";
    plan.identifiedNeeds = "Nec Identica";
    plan.specialSituations = "Sit Identica";
    plan.availableMaterials = "Mat Identica";
    plan.originalContext = {
      observations: "Obs Identica",
      identifiedNeeds: "Nec Identica",
      specialSituations: "Sit Identica",
      availableMaterials: "Mat Identica"
    };
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    await renderApp(service, source, "DIRECTOR");
    await act(async () => { fireEvent.click(screen.getByText(/Lista para conversar/i)); });

    expect(screen.queryByText(/CONTEXTO SEMANAL MODIFICADO/i)).toBeNull();
    expect(screen.queryByText(/ANTES:/i)).toBeNull();
    expect(screen.queryByText(/AHORA:/i)).toBeNull();
  });

  it("12. Existing H1R9 day-review behavior still works with context edit", async () => {
    const { service, source } = createTestDeps();
    await renderApp(service, source, "TEACHER");

    const obsInput = screen.getByPlaceholderText(/Los niños muestran interés/i);
    fireEvent.change(obsInput, { target: { value: "Contexto Base" } });

    await act(async () => { fireEvent.click(screen.getByText(/Generar Semana/i)); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    expect(screen.getByText(/0\/5 días revisados/i)).toBeDefined();

    // Unlock context and edit it
    await act(async () => { fireEvent.click(screen.getByText(/Editar contexto semanal/i)); });
    fireEvent.change(obsInput, { target: { value: "Contexto Editado Sin Afectar Review" } });
    await act(async () => { fireEvent.click(screen.getByText(/Guardar contexto semanal/i)); });

    // Review day 1
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    await act(async () => { fireEvent.click(screen.getByText("Guardar Día")); });

    expect(screen.getByText(/1\/5 días revisados/i)).toBeDefined();
  });
});
