import React, { useEffect, useState, useRef } from 'react';

export interface WeeklyPlanningAILoadingProgressProps {
  /**
   * Indicates whether the AI weekly planning generation is currently in-flight.
   */
  readonly isGenerating: boolean;

  /**
   * Optional flag indicating generation finished successfully, reaching 100%.
   */
  readonly isCompleted?: boolean;

  /**
   * Room or group display name (e.g. "Maternal A", "Lactantes C").
   */
  readonly roomName?: string;

  /**
   * Error message if generation failed.
   */
  readonly error?: string | null;

  /**
   * Optional callback to retry generation after an error.
   */
  readonly onRetry?: () => void;

  /**
   * Optional custom container class name.
   */
  readonly className?: string;
}

/**
 * Returns the contextual message according to estimated progress percentage and elapsed time.
 */
function getProgressMessage(percent: number, elapsedSec: number, roomName?: string): string {
  const roomLabel = roomName ? ` para ${roomName}` : '';
  if (percent >= 100) {
    return '¡Propuesta lista! Abriendo revisión…';
  }
  if (elapsedSec >= 24 || percent >= 90) {
    return 'Asegurando la calidad pedagógica y materiales… un momento por favor';
  }
  if (percent >= 70) {
    return 'Preparando tu propuesta para revisión';
  }
  if (percent >= 40) {
    return 'Organizando experiencias pedagógicas y rutinas';
  }
  if (percent >= 15) {
    return `TutorIA está preparando tu semana${roomLabel}`;
  }
  return 'Preparando propuesta semanal…';
}

/**
 * Calculates a smooth, non-linear estimated progress percentage based on elapsed milliseconds.
 *
 * Curve parameters:
 * - 0 - 3s: rapid initial responsiveness from 0% up to ~28%
 * - 3 - 10s: steady progress from ~28% up to ~62%
 * - 10 - 22s: deceleration from ~62% up to ~85%
 * - 22s+: asymptotic creep slowing down towards max 93-94%, strictly never reaching 95%+ or 100% while pending.
 */
function calculateEstimatedPercent(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs < 3000) {
    return (elapsedMs / 3000) * 28;
  }
  if (elapsedMs < 10000) {
    return 28 + ((elapsedMs - 3000) / 7000) * 34;
  }
  if (elapsedMs < 22000) {
    return 62 + ((elapsedMs - 10000) / 12000) * 23;
  }
  // Asymptotic deceleration towards 93.5%
  const asymptoticHeadroom = 8.5; // 85% + 8.5% = 93.5% max
  const creepFactor = 1 - Math.exp(-(elapsedMs - 22000) / 16000);
  return Math.min(94, 85 + asymptoticHeadroom * creepFactor);
}

/**
 * Reusable visual progress indicator for TutorIA AI generation (SR-MD-28N).
 *
 * Applicable to Lactantes A, B, C, Maternal A and future daycare rooms.
 * Uses a non-linear estimated progress bar (max 94% while pending) with contextual
 * sage green styling, respectful live regions, and safe timer teardown.
 */
export const WeeklyPlanningAILoadingProgress: React.FC<WeeklyPlanningAILoadingProgressProps> = ({
  isGenerating,
  isCompleted,
  roomName,
  error,
  onRetry,
  className = '',
}) => {
  const [percent, setPercent] = useState<number>(() => (isGenerating ? 5 : 0));
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // Manage progress simulation ticker
  useEffect(() => {
    if (isCompleted) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setPercent(100);
      return;
    }

    if (isGenerating) {
      startTimeRef.current = Date.now();
      setPercent((prev) => (prev > 0 ? prev : 5));
      setElapsedSec(0);

      timerRef.current = window.setInterval(() => {
        if (!startTimeRef.current) return;
        const elapsed = Date.now() - startTimeRef.current;
        setElapsedSec(Math.floor(elapsed / 1000));
        setPercent(calculateEstimatedPercent(elapsed));
      }, 150);
    } else {
      // Stopped generating
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = null;

      if (!error && percent > 0) {
        // Successful generation: complete to 100%
        setPercent(100);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isGenerating, isCompleted, error]);

  // If not generating, not completed, and no error, do not render
  if (!isGenerating && !isCompleted && !error && percent === 0) {
    return null;
  }

  // Displayed rounded percent (clamped between 0 and 100)
  const displayPercent = Math.min(100, Math.max(0, Math.round(percent)));
  const currentMessage = getProgressMessage(displayPercent, elapsedSec, roomName);

  // ERROR STATE
  if (error && !isGenerating) {
    return (
      <div
        data-testid="ai-generation-error-container"
        className={`w-full max-w-lg mx-auto bg-amber-50/90 border border-amber-300 rounded-2xl p-5 shadow-sm text-center animate-fade-in ${className}`}
        role="alert"
      >
        <div className="flex items-center justify-center gap-2 mb-2 text-amber-900 font-bold text-base">
          <span className="text-xl">⚠️</span>
          <span>No se pudo completar la generación con IA</span>
        </div>
        <p className="text-sm text-amber-950 font-medium leading-relaxed mb-4">
          {error}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-[#6b8c82] hover:bg-[#557269] text-white text-sm font-bold px-6 py-2.5 rounded-full shadow-sm transition hover:shadow focus:outline-none focus:ring-3 focus:ring-[#6b8c82]/40"
          >
            <span>🔄 Reintentar generación</span>
          </button>
        )}
      </div>
    );
  }

  // ACTIVE GENERATION PROGRESS STATE
  return (
    <div
      data-testid="ai-generation-progress-container"
      className={`w-full max-w-lg mx-auto bg-white/95 border border-[#6b8c82]/30 rounded-2xl p-6 shadow-md transition-all ${className}`}
      aria-busy={isGenerating}
    >
      {/* Header with badge and percentage */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#6b8c82]/15 text-[#557269] text-xs font-bold">
            ✨
          </span>
          <span className="text-xs font-bold tracking-wider uppercase text-[#3e4a50]">
            TutorIA • {roomName || 'Planeación'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-[#3e4a50]">
          <span data-testid="ai-progress-percentage">{displayPercent}%</span>
        </div>
      </div>

      {/* Main semantic progress bar */}
      <div
        role="progressbar"
        aria-valuenow={displayPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${displayPercent}% - ${currentMessage}`}
        aria-label="Progreso estimado de generación de planeación"
        className="w-full h-3.5 bg-[#e9e4d8] rounded-full overflow-hidden border border-[#dad3c5]/70 relative shadow-inner"
      >
        <div
          data-testid="ai-progress-bar-fill"
          className="h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden bg-[#6b8c82]"
          style={{ width: `${displayPercent}%` }}
        >
          {/* Animated gradient wave to show continuous living process */}
          <div
            className="absolute inset-0 w-full h-full opacity-40 animate-pulse bg-gradient-to-r from-transparent via-white to-transparent"
            style={{
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      </div>

      {/* Dynamic status message (polite live region for screen readers) */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <p
          role="status"
          aria-live="polite"
          data-testid="ai-progress-status-message"
          className="text-xs sm:text-sm font-semibold text-[#3e4a50] flex items-center gap-1.5"
        >
          <span>{currentMessage}</span>
        </p>

        {isGenerating && (
          <span className="flex items-center gap-1 text-xs text-[#6e7a7c] font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-[#6b8c82] animate-ping" />
            <span>activo</span>
          </span>
        )}
      </div>

      {/* Extra reassurance note when request is taking over 20 seconds */}
      {elapsedSec >= 20 && isGenerating && (
        <div className="mt-3 pt-2.5 border-t border-[#e9e4d8] text-center">
          <p className="text-xs text-[#6e7a7c] italic">
            El modelo está generando 25 actividades con progresión semanal completa. El proceso continúa activo.
          </p>
        </div>
      )}
    </div>
  );
};
