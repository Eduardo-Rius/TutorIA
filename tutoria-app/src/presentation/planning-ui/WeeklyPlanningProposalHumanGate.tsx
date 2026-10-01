import React from 'react';
import type {
  WeeklyPlanningProposalResponse,
  ProposedPlanningDay,
  ProposedActivity,
  WeeklyPlanningWeekday,
} from '../../application/planning/WeeklyPlanningProposalSource';

export interface WeeklyPlanningProposalHumanGateProps {
  readonly proposal: WeeklyPlanningProposalResponse;
  readonly onAccept: () => void;
  readonly onDiscard: () => void;
  readonly isAccepting?: boolean;
}

const WEEKDAY_SPANISH_NAMES: Readonly<Record<WeeklyPlanningWeekday, string>> = Object.freeze({
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
});

/**
 * WeeklyPlanningProposalHumanGate
 *
 * Explicit Human Authority Gate between AI Weekly Planning Proposals and
 * the governed WeeklyPlanning draft aggregate.
 *
 * CORE ARCHITECTURAL INVARIANTS:
 * 1. TUTORIA PROPOSES, ANITA DECIDES: An AI proposal is never automatically saved or applied.
 * 2. TRANSIENT REVIEW: Displays the complete 5-day week without technical metadata.
 * 3. EXPLICIT HUMAN ACTIONS: Anita must explicitly choose "Usar esta propuesta" or "Descartar".
 * 4. LIFECYCLE SEPARATION: "Usar esta propuesta" creates an editable DRAFT; it is NOT approval/closure.
 */
export const WeeklyPlanningProposalHumanGate: React.FC<WeeklyPlanningProposalHumanGateProps> = ({
  proposal,
  onAccept,
  onDiscard,
  isAccepting = false,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="human-gate-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-teal-100">
        {/* Header with explicit governance copy */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-teal-900 text-white px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="human-gate-title" className="text-2xl font-bold tracking-tight">
                Revisar propuesta de TutorIA
              </h2>
              <p className="text-sm text-teal-100 mt-1 font-medium">
                TutorIA preparó una propuesta para tu semana. Revísala antes de incorporarla a tu planeación.
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 bg-teal-700/60 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full border border-teal-500/40">
                <span>🛡️</span>
                <span>Tú decides qué usar.</span>
              </div>
            </div>
            <button
              onClick={onDiscard}
              className="text-teal-200 hover:text-white p-1 rounded-lg transition"
              aria-label="Cerrar revisión"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable content: complete 5-day schedule */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/60">
          {proposal.days.map((day: ProposedPlanningDay) => {
            const dayLabel = WEEKDAY_SPANISH_NAMES[day.dayOfWeek] || day.dayOfWeek;
            return (
              <div
                key={day.dayOfWeek}
                className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-sm hover:shadow transition"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <h3 className="text-lg font-bold text-teal-950 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block"></span>
                    <span>{dayLabel}</span>
                  </h3>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    {day.activities.length} {day.activities.length === 1 ? 'actividad' : 'actividades'}
                  </span>
                </div>

                <div className="space-y-4">
                  {day.activities.map((act: ProposedActivity, actIdx: number) => (
                    <div
                      key={actIdx}
                      className="bg-teal-50/30 border border-teal-100/80 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Categoría:
                          </span>
                          <span className="text-xs font-bold bg-teal-100 text-teal-900 px-2.5 py-0.5 rounded-md border border-teal-200/60">
                            {act.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <span className="font-bold text-gray-500 uppercase tracking-wider">Duración:</span>
                          <span className="font-semibold text-teal-900">{act.durationMinutes} min</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                          Objetivo:
                        </span>
                        <p className="text-sm text-gray-900 font-medium leading-relaxed">
                          {act.objective}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                          Descripción:
                        </span>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {act.description}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                          Materiales:
                        </span>
                        <p className="text-sm text-gray-800 font-medium">
                          {Array.isArray(act.materials) && act.materials.length > 0
                            ? act.materials.join(', ')
                            : act.materials
                            ? String(act.materials)
                            : 'Ninguno especificado'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions: Anita decides */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onDiscard}
            disabled={isAccepting}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-sm transition disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={isAccepting}
            className="px-7 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm transition shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-50"
          >
            {isAccepting ? 'Guardando borrador…' : 'Usar esta propuesta'}
          </button>
        </div>
      </div>
    </div>
  );
};
