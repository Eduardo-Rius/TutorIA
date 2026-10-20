import React, { useState } from "react";

export const FIRST_LIGHT_LAB_FLAG = "VITE_TUTORIA_FIRST_LIGHT_LAB";
export const FIRST_LIGHT_LAB_PROJECT_ID = "tutoria-identity-lab";
export const FIRST_LIGHT_ANITA_EMAIL = "anita@lab.tutoria.invalid";
export const FIRST_LIGHT_TEACHER_ID = "lab-teacher-anita";
export const FIRST_LIGHT_CECI_EMAIL = "ceci@lab.tutoria.invalid";
export const FIRST_LIGHT_DIRECTOR_ID = "lab-director-ceci";
export const FIRST_LIGHT_TERE_EMAIL = "tere@lab.tutoria.invalid";
export const FIRST_LIGHT_SUPERVISOR_ID = "lab-supervisor-tere";
export const FIRST_LIGHT_DAYCARE_ID = "00000000-0000-4000-8000-000000000001";
export const FIRST_LIGHT_ROOM_ID = "room-lactantes-a";
export const FIRST_LIGHT_PLANNING_ID = "f1000000-0000-4000-8000-000000000001";

// Guardería 002 (Piloto Andrea)
export const FIRST_LIGHT_G002_DAYCARE_ID = "00000000-0000-4000-8000-000000000002";
export const FIRST_LIGHT_G002_TEACHER_EMAIL = "asistente.g002@lab.tutoria.invalid";
export const FIRST_LIGHT_G002_TEACHER_ID = "lab-g002-asistente";
export const FIRST_LIGHT_G002_DIRECTOR_EMAIL = "educadora.g002@lab.tutoria.invalid";
export const FIRST_LIGHT_G002_DIRECTOR_ID = "lab-g002-educadora";
export const FIRST_LIGHT_G002_SUPERVISOR_EMAIL = "directora.g002@lab.tutoria.invalid";
export const FIRST_LIGHT_G002_SUPERVISOR_ID = "lab-g002-directora";

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
  onLogin: (password: string, email?: string) => Promise<void>;
  onLogout: () => Promise<void>;
  isLoggingIn?: boolean | undefined;
  loginError?: string | null | undefined;
}

export type FirstLightIdentityOption =
  | "G002_TEACHER"
  | "G002_DIRECTOR"
  | "G002_SUPERVISOR"
  | "TEACHER"
  | "DIRECTOR"
  | "SUPERVISOR";

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
  const [selectedRole, setSelectedRole] = useState<FirstLightIdentityOption>("TEACHER");

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
    const targetEmail =
      selectedRole === "G002_SUPERVISOR"
        ? FIRST_LIGHT_G002_SUPERVISOR_EMAIL
        : selectedRole === "G002_DIRECTOR"
        ? FIRST_LIGHT_G002_DIRECTOR_EMAIL
        : selectedRole === "G002_TEACHER"
        ? FIRST_LIGHT_G002_TEACHER_EMAIL
        : selectedRole === "SUPERVISOR"
        ? FIRST_LIGHT_TERE_EMAIL
        : selectedRole === "DIRECTOR"
        ? FIRST_LIGHT_CECI_EMAIL
        : FIRST_LIGHT_ANITA_EMAIL;
    await onLogin(currentPassword, targetEmail);
  };

  const isTere = authenticatedEmail === FIRST_LIGHT_TERE_EMAIL;
  const isCeci = authenticatedEmail === FIRST_LIGHT_CECI_EMAIL;
  const isAnita = authenticatedEmail === FIRST_LIGHT_ANITA_EMAIL;
  const isG002Tere = authenticatedEmail === FIRST_LIGHT_G002_SUPERVISOR_EMAIL;
  const isG002Ceci = authenticatedEmail === FIRST_LIGHT_G002_DIRECTOR_EMAIL;
  const isG002Anita = authenticatedEmail === FIRST_LIGHT_G002_TEACHER_EMAIL;

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
              <span>✅</span> {
                isTere ? `Directora (${FIRST_LIGHT_TERE_EMAIL})` :
                isCeci ? `Educadora (${FIRST_LIGHT_CECI_EMAIL})` :
                isAnita ? `Asistente Educativa (${FIRST_LIGHT_ANITA_EMAIL})` :
                isG002Tere ? `Directora — G002 (${FIRST_LIGHT_G002_SUPERVISOR_EMAIL})` :
                isG002Ceci ? `Educadora — G002 (${FIRST_LIGHT_G002_DIRECTOR_EMAIL})` :
                isG002Anita ? `Asistente Educativa — G002 (${FIRST_LIGHT_G002_TEACHER_EMAIL})` :
                authenticatedEmail
              }
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
            <div className="flex items-center gap-1 mr-1">
              <label htmlFor="first-light-identity-select" className="text-amber-800 font-medium">
                Identidad:
              </label>
              <select
                id="first-light-identity-select"
                data-testid="first-light-identity-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as FirstLightIdentityOption)}
                disabled={isLoggingIn}
                className="text-xs bg-white border border-amber-300 rounded px-1.5 py-0.5 font-semibold text-amber-900 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <optgroup label="Guardería 002 (Andrea)">
                  <option value="G002_TEACHER">Asistente Educativa — G002</option>
                  <option value="G002_DIRECTOR">Educadora — G002</option>
                  <option value="G002_SUPERVISOR">Directora — G002</option>
                </optgroup>
                <optgroup label="Guardería 001 (LAB PO)">
                  <option value="TEACHER">Asistente Educativa (Anita - G001)</option>
                  <option value="DIRECTOR">Educadora (Ceci - G001)</option>
                  <option value="SUPERVISOR">Directora (Tere - G001)</option>
                </optgroup>
              </select>
            </div>
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
              <input
                type="password"
                data-testid="first-light-password-input"
                placeholder={
                  selectedRole === "G002_SUPERVISOR" || selectedRole === "SUPERVISOR"
                    ? "Contraseña de Directora LAB"
                    : selectedRole === "G002_DIRECTOR" || selectedRole === "DIRECTOR"
                    ? "Contraseña de Educadora LAB"
                    : "Contraseña de Asistente Educativa LAB"
                }
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
