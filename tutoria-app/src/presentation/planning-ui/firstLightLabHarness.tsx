import React, { useState } from "react";

export const FIRST_LIGHT_LAB_FLAG = "VITE_TUTORIA_FIRST_LIGHT_LAB";
export const FIRST_LIGHT_LAB_PROJECT_ID = "tutoria-identity-lab";
export const FIRST_LIGHT_ANITA_EMAIL = "anita@lab.tutoria.invalid";
export const FIRST_LIGHT_DAYCARE_ID = "00000000-0000-4000-8000-000000000001";
export const FIRST_LIGHT_ROOM_ID = "room-lactantes-a";

export interface FirstLightGuardResult {
  readonly isEligible: boolean;
  readonly error?: string | undefined;
}

/**
 * Validates whether the application is authorized to activate the First-Light LAB harness.
 *
 * FAIL-CLOSED INVARIANTS:
 * 1. Default / absent flag -> INELIGIBLE (First Light OFF).
 * 2. Flag !== "true" / boolean true -> INELIGIBLE.
 * 3. Flag === "true" but Firebase projectId !== "tutoria-identity-lab" -> FAIL CLOSED (error returned).
 * 4. Production project ("guarderiasimss-5cb09") -> STRICTLY BLOCKED.
 * 5. Only flag === "true" AND projectId === "tutoria-identity-lab" -> ELIGIBLE.
 */
export function evaluateFirstLightLabGuard(
  env: Record<string, any> = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {}
): FirstLightGuardResult {
  const flag = env[FIRST_LIGHT_LAB_FLAG];
  const isFlagActive = flag === "true" || flag === true;
  if (!isFlagActive) {
    return { isEligible: false };
  }

  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  if (projectId !== FIRST_LIGHT_LAB_PROJECT_ID) {
    return {
      isEligible: false,
      error: "First Light is restricted to TutorIA LAB.",
    };
  }

  return { isEligible: true };
}

export interface FirstLightLabBannerProps {
  isEligible: boolean;
  guardError?: string | undefined;
  authenticatedEmail: string | null;
  onLogin: (password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  isLoggingIn?: boolean | undefined;
  loginError?: string | null | undefined;
}

/**
 * Developer-only banner displayed when First-Light LAB harness is active or blocked.
 * Enforces zero-leak password handling: password is never logged, persisted in storage,
 * or exposed in UI state after submission.
 */
export const FirstLightLabBanner: React.FC<FirstLightLabBannerProps> = ({
  isEligible,
  guardError,
  authenticatedEmail,
  onLogin,
  onLogout,
  isLoggingIn = false,
  loginError = null,
}) => {
  const [password, setPassword] = useState("");

  if (guardError) {
    return (
      <div
        data-testid="first-light-guard-error"
        className="bg-red-50 border-b border-red-200 px-4 py-2 text-center text-xs text-red-800 flex items-center justify-center gap-2 font-medium"
      >
        <span>⚠️</span>
        <span>
          <strong>FIRST LIGHT BLOQUEADO:</strong> {guardError}
        </span>
      </div>
    );
  }

  if (!isEligible) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isLoggingIn) return;
    const currentPassword = password;
    setPassword(""); // Immediately clear password from component state
    await onLogin(currentPassword);
  };

  return (
    <div
      data-testid="first-light-banner"
      className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3 shadow-xs"
    >
      <div className="flex items-center gap-2">
        <span className="bg-amber-600 text-white font-bold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded">
          🔬 FIRST LIGHT LAB
        </span>
        <span className="font-semibold text-amber-900">
          Fuente IA: <span className="underline decoration-amber-400">Firebase LAB (recommendCurricularPDA / proposeWeeklyPlanning)</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {authenticatedEmail ? (
          <div className="flex items-center gap-2" data-testid="first-light-auth-status">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <span>✅</span> {authenticatedEmail}
            </span>
            <button
              type="button"
              data-testid="first-light-logout-btn"
              onClick={onLogout}
              className="text-[11px] bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded px-2 py-0.5 font-medium transition cursor-pointer"
            >
              Cerrar sesión LAB
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-amber-800 font-medium">
              Identidad: <strong>{FIRST_LIGHT_ANITA_EMAIL}</strong>
            </span>
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
              <input
                type="password"
                data-testid="first-light-password-input"
                placeholder="Contraseña de Anita LAB"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
                required
                className="text-xs bg-white border border-amber-300 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400"
              />
              <button
                type="submit"
                data-testid="first-light-login-btn"
                disabled={isLoggingIn || !password}
                className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded px-2.5 py-0.5 shadow-xs transition cursor-pointer"
              >
                {isLoggingIn ? "Autenticando..." : "Autenticar en LAB"}
              </button>
            </form>
            {loginError && (
              <span data-testid="first-light-login-error" className="text-red-700 font-bold text-[11px]">
                {loginError}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
