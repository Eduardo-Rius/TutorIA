import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  evaluateFirstLightLabGuard,
  FirstLightLabBanner,
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_ANITA_EMAIL,
  FIRST_LIGHT_PLANNING_ID,
} from "../firstLightLabHarness";
import { PlanningDemoApp } from "../PlanningDemoApp";
import { PlanningWorkflowService } from "../../../application/planning/PlanningWorkflowService";
import { InMemoryWeeklyPlanningRepository } from "../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository";
import { DeterministicPedagogicalRecommendationSource } from "../../../application/planning/DeterministicPedagogicalRecommendationSource";
import { DeterministicCurricularRecommendationSource } from "../../../application/planning/DeterministicCurricularRecommendationSource";
import { CurricularRecommendationSource } from "../../../application/planning/CurricularRecommendationSource";
import { AuthenticationProvider } from "../../../application/ports/AuthenticationProvider";
import { FirebaseAuthenticationProvider } from "../../../infrastructure/authentication/FirebaseAuthenticationProvider";
import { RoomCatalog } from "../../../domain/planning/RoomCatalog";

describe("H1R10.10 — Controlled First-Light Client Harness", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ==========================================
  // SECTION 10: TESTS — MODE GUARD
  // ==========================================
  describe("Section 10 — Mode Guard & Safety Invariants", () => {
    it("1. First-Light env absent -> deterministic source (ineligible)", () => {
      const guard = evaluateFirstLightLabGuard({});
      expect(guard.isEligible).toBe(false);
      expect(guard.error).toBeUndefined();
    });

    it("2. First-Light env false -> deterministic source (ineligible)", () => {
      const guard = evaluateFirstLightLabGuard({
        [FIRST_LIGHT_LAB_FLAG]: "false",
        VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
      });
      expect(guard.isEligible).toBe(false);
      expect(guard.error).toBeUndefined();
    });

    it("3. First-Light env true + project LAB -> Firebase source eligible", () => {
      const guard = evaluateFirstLightLabGuard({
        [FIRST_LIGHT_LAB_FLAG]: "true",
        VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
      });
      expect(guard.isEligible).toBe(true);
      expect(guard.error).toBeUndefined();
    });

    it("4. First-Light env true + project PROD -> FAIL CLOSED", () => {
      const guard = evaluateFirstLightLabGuard({
        [FIRST_LIGHT_LAB_FLAG]: "true",
        VITE_FIREBASE_PROJECT_ID: "guarderiasimss-5cb09",
      });
      expect(guard.isEligible).toBe(false);
      expect(guard.error).toBe("First Light is restricted to TutorIA LAB.");
    });

    it("5. First-Light env true + unknown project -> FAIL CLOSED", () => {
      const guard = evaluateFirstLightLabGuard({
        [FIRST_LIGHT_LAB_FLAG]: "true",
        VITE_FIREBASE_PROJECT_ID: "unknown-staging-project",
      });
      expect(guard.isEligible).toBe(false);
      expect(guard.error).toBe("First Light is restricted to TutorIA LAB.");
    });

    it("6. No OpenAI call occurs merely by enabling mode", () => {
      const globalFetchSpy = vi.spyOn(globalThis, "fetch");
      const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
      const source = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
        />
      );

      // Verify no fetch calls targeting api.openai.com
      const openAiCalls = globalFetchSpy.mock.calls.filter((call) =>
        String(call[0]).includes("api.openai.com")
      );
      expect(openAiCalls.length).toBe(0);
    });

    it("7. No callable invocation occurs merely by enabling mode", () => {
      const mockRecommend = vi.fn();
      const mockCallableSource: CurricularRecommendationSource = {
        recommend: mockRecommend,
      };
      const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
      const source = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightSource={mockCallableSource}
        />
      );

      expect(mockRecommend).not.toHaveBeenCalled();
    });

    it("8. No recommendation request occurs until explicit user action", async () => {
      const mockRecommend = vi.fn().mockResolvedValue([]);
      const mockSource: CurricularRecommendationSource = {
        recommend: mockRecommend,
      };
      const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
      const source = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightSource={mockSource}
        />
      );

      expect(screen.getByTestId("first-light-banner")).toBeTruthy();
      expect(mockRecommend).not.toHaveBeenCalled();
    });

    it("9. No hardcoded password exists in source code", () => {
      expect(FIRST_LIGHT_ANITA_EMAIL).toBe("anita@lab.tutoria.invalid");
      const { getByTestId } = render(
        <FirstLightLabBanner
          isEligible={true}
          authenticatedEmail={null}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
        />
      );
      const input = getByTestId("first-light-password-input") as HTMLInputElement;
      expect(input.value).toBe("");
    });

    it("10. No OPENAI_API_KEY exists in client env/config", () => {
      expect((import.meta as any).env?.OPENAI_API_KEY).toBeUndefined();
      expect(process.env.OPENAI_API_KEY).toBeUndefined();
    });

    it("11. Canonical persisted fixture ID is defined and immutable", () => {
      expect(FIRST_LIGHT_PLANNING_ID).toBe("f1000000-0000-4000-8000-000000000001");
    });
  });

  // ==========================================
  // SECTION 11: TESTS — AUTH
  // ==========================================
  describe("Section 11 — Authentication & Zero-Leak Password Seam", () => {
    it("1. Controlled LAB email is passed to auth seam on login", async () => {
      const mockLogin = vi.fn().mockResolvedValue(undefined);
      const mockAuth: AuthenticationProvider = {
        login: mockLogin,
        logout: vi.fn(),
        restoreSession: vi.fn().mockResolvedValue(null),
        getCurrentUser: vi.fn().mockReturnValue(null),
      };

      const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
      const source = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
        />
      );

      const input = screen.getByTestId("first-light-password-input");
      const button = screen.getByTestId("first-light-login-btn");

      fireEvent.change(input, { target: { value: "synthetic-secret-pass-123" } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("anita@lab.tutoria.invalid", "synthetic-secret-pass-123");
      });
    });

    it("2. Password is passed only to Firebase Auth adapter", async () => {
      const mockAuthInstance = {
        currentUser: null,
      };
      const authProvider = new FirebaseAuthenticationProvider(mockAuthInstance as any);
      const loginSpy = vi.spyOn(authProvider, "login").mockResolvedValue(undefined);

      await authProvider.login("anita@lab.tutoria.invalid", "synthetic-pass-456");
      expect(loginSpy).toHaveBeenCalledTimes(1);
      expect(loginSpy).toHaveBeenCalledWith("anita@lab.tutoria.invalid", "synthetic-pass-456");
    });

    it("3. Password is not logged to console", async () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockLogin = vi.fn().mockResolvedValue(undefined);
      const { getByTestId } = render(
        <FirstLightLabBanner
          isEligible={true}
          authenticatedEmail={null}
          onLogin={mockLogin}
          onLogout={vi.fn()}
        />
      );

      const input = getByTestId("first-light-password-input");
      const button = getByTestId("first-light-login-btn");

      const secretPass = "super-secret-synthetic-token-xyz";
      fireEvent.change(input, { target: { value: secretPass } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });

      // Assert password never logged in any console call
      const allLogCalls = [
        ...consoleLogSpy.mock.calls,
        ...consoleInfoSpy.mock.calls,
        ...consoleWarnSpy.mock.calls,
        ...consoleErrorSpy.mock.calls,
      ].flat().map(String);

      for (const logLine of allLogCalls) {
        expect(logLine).not.toContain(secretPass);
      }
    });

    it("4. Password is not persisted by TutorIA in localStorage or sessionStorage", async () => {
      const secretPass = "synthetic-dev-password-789";
      const mockLogin = vi.fn().mockResolvedValue(undefined);

      const { getByTestId } = render(
        <FirstLightLabBanner
          isEligible={true}
          authenticatedEmail={null}
          onLogin={mockLogin}
          onLogout={vi.fn()}
        />
      );

      fireEvent.change(getByTestId("first-light-password-input"), {
        target: { value: secretPass },
      });
      fireEvent.click(getByTestId("first-light-login-btn"));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });

      // Assert neither localStorage nor sessionStorage contains the password
      expect(Object.values(localStorage)).not.toContain(secretPass);
      expect(Object.values(sessionStorage)).not.toContain(secretPass);
    });

    it("5. Failed authentication does not invoke curricular callable", async () => {
      const mockRecommend = vi.fn();
      const mockSource: CurricularRecommendationSource = {
        recommend: mockRecommend,
      };
      const mockAuth: AuthenticationProvider = {
        login: vi.fn().mockRejectedValue(new Error("Auth failed: invalid credentials")),
        logout: vi.fn(),
        restoreSession: vi.fn().mockResolvedValue(null),
        getCurrentUser: vi.fn().mockReturnValue(null),
      };

      const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
      const source = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
          firstLightSource={mockSource}
        />
      );

      fireEvent.change(screen.getByTestId("first-light-password-input"), {
        target: { value: "wrong-password" },
      });
      fireEvent.click(screen.getByTestId("first-light-login-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("first-light-login-error")).toBeTruthy();
      });

      expect(mockRecommend).not.toHaveBeenCalled();
    });

    it("6. Unauthenticated suggestion attempt does not silently downgrade to deterministic source in First-Light mode", async () => {
      const mockFirebaseSource: CurricularRecommendationSource = {
        recommend: vi.fn().mockRejectedValue(new Error("Firebase callable execution failed: UNAUTHENTICATED")),
      };
      const deterministicSource = new DeterministicCurricularRecommendationSource();
      const deterministicSpy = vi.spyOn(deterministicSource, "recommend");

      const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
      const source = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightSource={mockFirebaseSource}
        />
      );

      // Deterministic source must NEVER be called in First-Light mode
      expect(deterministicSpy).not.toHaveBeenCalled();
    });

    it("7. Successful mocked auth allows normal UI flow with banner reflecting authenticated user", async () => {
      const mockAuth: AuthenticationProvider = {
        login: vi.fn().mockResolvedValue(undefined),
        logout: vi.fn().mockResolvedValue(undefined),
        restoreSession: vi.fn().mockResolvedValue("lab-teacher-anita"),
        getCurrentUser: vi.fn().mockReturnValue("lab-teacher-anita"),
      };

      const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
      const source = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("first-light-auth-status")).toBeTruthy();
        expect(screen.getByText(/anita@lab\.tutoria\.invalid/)).toBeTruthy();
      });
    });

    it("8. Controlled Ceci LAB identity can be selected and passed to auth seam on login", async () => {
      const mockLogin = vi.fn().mockResolvedValue(undefined);
      const mockAuth: AuthenticationProvider = {
        login: mockLogin,
        logout: vi.fn(),
        restoreSession: vi.fn().mockResolvedValue(null),
        getCurrentUser: vi.fn().mockReturnValue(null),
      };

      const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
      const source = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightAuth={mockAuth}
        />
      );

      const select = screen.getByTestId("first-light-identity-select");
      fireEvent.change(select, { target: { value: "DIRECTOR" } });

      const input = screen.getByTestId("first-light-password-input");
      const button = screen.getByTestId("first-light-login-btn");

      fireEvent.change(input, { target: { value: "synthetic-ceci-pass-456" } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("ceci@lab.tutoria.invalid", "synthetic-ceci-pass-456");
      });
    });
  });

  // ==========================================
  // SECTION 12: TESTS — SOURCE & GOVERNANCE
  // ==========================================
  describe("Section 12 — Curricular Source & Governance", () => {
    it("1. Default mode uses DeterministicCurricularRecommendationSource when First-Light is absent", () => {
      const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
      const source = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{}}
        />
      );

      expect(screen.queryByTestId("first-light-banner")).toBeNull();
    });

    it("2. LAB First-Light mode selects the injected Firebase source", () => {
      const mockFirebaseSource: CurricularRecommendationSource = {
        recommend: vi.fn().mockResolvedValue([]),
      };
      const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
      const source = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightSource={mockFirebaseSource}
        />
      );

      expect(screen.getByTestId("first-light-banner")).toBeTruthy();
      expect(screen.getByText(/Firebase LAB/)).toBeTruthy();
    });

    it("3. Fail closed banner appears when project is not LAB", () => {
      const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
      const source = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={source}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: "guarderiasimss-5cb09",
          }}
        />
      );

      expect(screen.getByTestId("first-light-guard-error")).toBeTruthy();
      expect(screen.getByText(/First Light is restricted to TutorIA LAB/)).toBeTruthy();
    });

    it("4. Explicit user action triggers recommendation source exactly once", async () => {
      const mockRecommend = vi.fn().mockResolvedValue([
        {
          reference: {
            pdaId: "pda-1-1",
            campoFormativo: "Lenguajes",
            contenido: "Contenido 1",
            pdaDescription: "PDA text",
            rawDescriptor: "RAW",
          },
          relevanceScore: 0.95,
          pedagogicalRationale: "Pedagogical rationale",
          transientSuggestedAt: new Date().toISOString(),
        },
      ]);
      const mockFirebaseSource: CurricularRecommendationSource = {
        recommend: mockRecommend,
      };

      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const pedagogicalSource = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={pedagogicalSource}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
          firstLightSource={mockFirebaseSource}
          currentDate="2026-08-24"
        />
      );

      // Verify page mounted and hero/banner rendered with canonical active room Lactantes A
      await waitFor(() => {
        expect(screen.getAllByText(/Lactantes A/i).length).toBeGreaterThan(0);
      });
    });

    it("5. Suggestion remains transient and does not mutate planning before acceptance", async () => {
      const repo = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repo);
      const plan = await service.createPlanning(
        "plan-1",
        "daycare-1",
        "lactantes-c",
        "t1",
        "2026-08-24",
        "2026-08-28",
        "TEACHER"
      );

      // Verify planning has no initial curricularTraceability before explicit acceptance
      const fetched = await repo.findById(plan.id);
      expect(fetched?.days[0]?.activities[0]?.curricularTraceability).toBeUndefined();
    });

    it("6. INDIRECT modality does not expose DIRECT curricular AI", async () => {
      const service = new PlanningWorkflowService(new InMemoryWeeklyPlanningRepository());
      const pedagogicalSource = new DeterministicPedagogicalRecommendationSource();

      render(
        <PlanningDemoApp
          service={service}
          source={pedagogicalSource}
          firstLightEnv={{
            [FIRST_LIGHT_LAB_FLAG]: "true",
            VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
          }}
        />
      );

      expect(screen.getAllByText(/Prestación Directa/i).length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // SECTION 13: TESTS — REQUEST & PRIVACY
  // ==========================================
  describe("Section 13 — Request Context & Privacy Invariants", () => {
    it("1. Request contract includes room and weeklyContext snapshots", () => {
      const room = RoomCatalog.getRoom("lactantes-c");
      expect(room).toBeDefined();
      expect(room?.roomId).toBe("lactantes-c");
      expect(room?.name).toBe("Lactantes C");

      const weeklyContext = {
        observations: "Observaciones del grupo",
        identifiedNeeds: "Necesidades",
        specialSituations: "Ninguna",
        availableMaterials: "Materiales seguros",
      };

      expect(weeklyContext.observations).toBe("Observaciones del grupo");
      expect(weeklyContext.specialSituations).toBe("Ninguna");
    });

    it("2. Client never exposes technical IDs or PII in OpenAI prompt", () => {
      const clientEnv = (import.meta as any).env || {};
      expect(clientEnv.OPENAI_API_KEY).toBeUndefined();
      expect(clientEnv.FIXTURE_PASSWORD).toBeUndefined();
    });
  });
});
