import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { WeeklyPlanning } from "../../../domain/planning/WeeklyPlanning";

describe("H1R9-B.2: Director 5/5 Review Gate & Visible Day State (Bullet 2)", () => {
  const createTestDeps = () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const source = new DeterministicPedagogicalRecommendationSource();
    return { repo, service, source };
  };

  const renderApp = async (service: PlanningWorkflowService, source: DeterministicPedagogicalRecommendationSource, role: "TEACHER"|"DIRECTOR"|"SUPERVISOR" = "DIRECTOR", startNew: boolean = true) => {
    await act(async () => {
      render(<PlanningDemoApp service={service} source={source} />);
    });
    await act(async () => {
      if (role === "DIRECTOR") {
        fireEvent.click(screen.getByText("Ceci (Directora)"));
      } else if (role === "TEACHER") {
        fireEvent.click(screen.getByText("Anita (Pedagoga)"));
        if (startNew) fireEvent.click(screen.getByText("✨ Comenzar nuestra semana"));
      } else if (role === "SUPERVISOR") {
        fireEvent.click(screen.getByText("Tere (Supervisora)"));
      }
    });
  };

  it("01-05. Director opens with 0/5, opening day does NOT review, Marcar dia revisado makes day GREEN with check and changes button, counter updates 0/5 -> 1/5", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = WeeklyPlanning.create("plan-1", "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "", "", "", "");
    plan.days = recs;
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    await renderApp(service, source, "DIRECTOR");
    await act(async () => { fireEvent.click(screen.getByText(/Lista para conversar/i)); });

    // 1. Director opens with 0/5 reviewed
    expect(screen.getByText("0/5 días revisados")).toBeDefined();

    // 2. Merely navigating/opening a day does NOT mark it as reviewed
    const tabMartes = screen.getByRole("tab", { name: /Martes 25/i });
    await act(async () => { fireEvent.click(tabMartes); });
    expect(screen.getByText("0/5 días revisados")).toBeDefined();
    expect(tabMartes.className).not.toContain("bg-green");
    expect(tabMartes.className).not.toContain("bg-orange");

    // 3 & 4. Clicking "Marcar día revisado" makes that day visibly GREEN and changes button
    const markBtn = screen.getByText("Marcar día revisado");
    await act(async () => { fireEvent.click(markBtn); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    // Tab shows check and green
    const updatedTabMartes = screen.getByRole("tab", { name: /✓ Martes 25/i });
    expect(updatedTabMartes.className).toContain("bg-green");

    // Button changed to "✓ Día revisado" and is disabled
    const reviewedBtn = screen.getByText("Día revisado");
    expect(reviewedBtn.closest("button")).toHaveProperty("disabled", true);

    // 5. Progress changes 0/5 -> 1/5
    expect(screen.getByText("1/5 días revisados")).toBeDefined();
  });

  it("06-09. Creating an observation automatically marks day reviewed as ORANGE, prepared observation makes day ORANGE immediately, Green + Orange both count toward 5/5", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = WeeklyPlanning.create("plan-obs", "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "", "", "", "");
    plan.days = recs;
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    await renderApp(service, source, "DIRECTOR");
    await act(async () => { fireEvent.click(screen.getByText(/Lista para conversar/i)); });

    expect(screen.getByText("0/5 días revisados")).toBeDefined();

    // Day 1 (Monday): mark as green
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Lunes 24/i })); });
    await act(async () => { fireEvent.click(screen.getByText("Marcar día revisado")); });
    expect(screen.getByText("1/5 días revisados")).toBeDefined();

    // Day 2 (Tuesday): create an observation without clicking Marcar dia revisado
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Martes 25/i })); });
    await act(async () => { fireEvent.click(screen.getAllByText("Revisar")[0]!); });
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/¿Qué sugerencia tienes sobre esta actividad?/i), {
        target: { value: "Ajustar material martes" }
      });
    });
    await act(async () => { fireEvent.click(screen.getByText("Guardar observación")); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    // 6, 7 & 8. Observation day automatically becomes ORANGE and counts as reviewed immediately
    const tabMartesOrange = screen.getByRole("tab", { name: /🟠 Martes 25/i });
    expect(tabMartesOrange.className).toContain("bg-orange");

    // 9. Green (Monday) + Orange (Tuesday) both count -> 2/5 días revisados
    expect(screen.getByText("2/5 días revisados")).toBeDefined();
  });

  it("10-13. Approval Gate: 4/5 cannot approve, 5/5 with prepared feedback cannot approve, 5/5 with unresolved feedback cannot approve, 5/5 clean can approve", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = WeeklyPlanning.create("plan-gate", "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "", "", "", "");
    plan.days = recs;
    plan.status = "IN_REVIEW";
    await repo.save(plan);

    await renderApp(service, source, "DIRECTOR");
    await act(async () => { fireEvent.click(screen.getByText(/Lista para conversar/i)); });

    const approveBtn = screen.getByText("✓ APROBAR TODA LA PLANEACIÓN").closest("button")!;

    // 10. 0/5 through 4/5 reviewed cannot approve
    expect(approveBtn).toHaveProperty("disabled", true);

    const days = ["Lunes 24", "Martes 25", "Miércoles 26", "Jueves 27"];
    for (const d of days) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") })); });
      await act(async () => { fireEvent.click(screen.getByText("Marcar día revisado")); });
    }

    expect(screen.getByText("4/5 días revisados")).toBeDefined();
    expect(approveBtn).toHaveProperty("disabled", true);

    // Review 5th day with an observation prepared (Friday)
    await act(async () => { fireEvent.click(screen.getByRole("tab", { name: /Viernes 28/i })); });
    await act(async () => { fireEvent.click(screen.getAllByText("Revisar")[0]!); });
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/¿Qué sugerencia tienes sobre esta actividad?/i), {
        target: { value: "Ajuste viernes" }
      });
    });
    await act(async () => { fireEvent.click(screen.getByText("Guardar observación")); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    expect(screen.getByText("5/5 días revisados")).toBeDefined();

    // 11. 5/5 with prepared feedback CANNOT approve
    expect(approveBtn).toHaveProperty("disabled", true);
    expect(screen.getAllByText(/ENVIAR OBSERVACIONES A LA EDUCADORA/i).length).toBeGreaterThan(0);

    // Delete the prepared observation to make Friday clean
    await act(async () => { fireEvent.click(screen.getByText(/Eliminar observación/i)); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    // Friday is already marked reviewed (with observation removed) -> shows "Día revisado"
    expect(screen.getByText("Día revisado")).toBeDefined();

    // 13. 5/5 clean with zero feedback CAN approve
    expect(screen.getByText("5/5 días revisados")).toBeDefined();
    expect(approveBtn).not.toHaveProperty("disabled", true);

    // Click approve and verify status transitions to APPROVED
    await act(async () => { fireEvent.click(approveBtn); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    const approvedPlan = await repo.findById("plan-gate");
    expect(approvedPlan?.status).toBe("APPROVED");
  });

  it("12. 5/5 with unresolved feedback cannot approve", async () => {
    const { repo, service, source } = createTestDeps();
    const plan = WeeklyPlanning.create("plan-unresolved", "dc-1", "lactantes-c", "t1", "2026-08-24", "2026-08-28");
    const recs = await source.generateRecommendation(null as any, "", "", "", "");
    plan.days = recs;
    plan.status = "IN_REVIEW";
    plan.granularObservations = [
      {
        targetId: recs[0]!.activities[0]!.activityId,
        observation: "Unresolved feedback",
        originalContent: "Original",
        currentContent: "Original",
        status: "PENDING_CORRECTION",
        reviewer: "Ceci",
        timestamp: new Date()
      }
    ];
    await repo.save(plan);

    await renderApp(service, source, "DIRECTOR");
    await act(async () => { fireEvent.click(screen.getByText(/Lista para conversar/i)); });

    // Mark all other days
    const otherDays = ["Martes 25", "Miércoles 26", "Jueves 27", "Viernes 28"];
    for (const d of otherDays) {
      await act(async () => { fireEvent.click(screen.getByRole("tab", { name: new RegExp(d, "i") })); });
      await act(async () => { fireEvent.click(screen.getByText("Marcar día revisado")); });
    }

    // All 5 days counted (Lunes is orange due to pending observation)
    expect(screen.getByText("5/5 días revisados")).toBeDefined();

    const approveBtn = screen.getByText("✓ APROBAR TODA LA PLANEACIÓN").closest("button")!;
    // Blocked from approval because pending observation exists
    expect(approveBtn).toHaveProperty("disabled", true);
  });
});
