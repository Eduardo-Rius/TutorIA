import React, { useState, useMemo } from 'react';
import type { EvaluationWeekday } from '../../application/planning/GovernedEvaluationAIContract';
import {
  type EvaluationRecommendationSource,
  FirebaseEvaluationRecommendationSource,
} from '../../infrastructure/ai/FirebaseEvaluationRecommendationSource';

export type DailyEvaluationHumanGateState =
  | 'IDLE'
  | 'COLLECTING_EVIDENCE'
  | 'REQUESTING'
  | 'SUGGESTION_AVAILABLE'
  | 'ERROR';

export interface DailyEvaluationHumanGateProps {
  planningId: string;
  dayOfWeek: EvaluationWeekday;
  isEligible: boolean;
  source?: EvaluationRecommendationSource;
  onAccept: (suggestedText: string) => void;
  onEdit: (suggestedText: string) => void;
  onDiscard?: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export const DailyEvaluationHumanGate: React.FC<DailyEvaluationHumanGateProps> = ({
  planningId,
  dayOfWeek,
  isEligible,
  source,
  onAccept,
  onEdit,
  onDiscard,
  textareaRef,
}) => {
  const [state, setState] = useState<DailyEvaluationHumanGateState>('IDLE');
  const [activitiesDevelopment, setActivitiesDevelopment] = useState('');
  const [groupResponse, setGroupResponse] = useState('');
  const [adaptations, setAdaptations] = useState('');
  const [continuity, setContinuity] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recommendationSource = useMemo(
    () => source || new FirebaseEvaluationRecommendationSource(),
    [source]
  );

  // If not eligible (e.g. non-TEACHER, not APPROVED_FOR_EXECUTION, chronologically blocked, etc.)
  if (!isEligible) {
    return null;
  }

  const devTrimmed = activitiesDevelopment.trim();
  const respTrimmed = groupResponse.trim();
  const adapTrimmed = adaptations.trim();
  const contTrimmed = continuity.trim();

  // Mandatory length rules: 15–600 characters
  const isDevValid = devTrimmed.length >= 15 && activitiesDevelopment.length <= 600;
  const isRespValid = respTrimmed.length >= 15 && groupResponse.length <= 600;
  // Optional length rules: max 400 characters
  const isAdapValid = adaptations.length <= 400;
  const isContValid = continuity.length <= 400;

  const isEvidenceValid = isDevValid && isRespValid && isAdapValid && isContValid;

  const handleOpenForm = () => {
    setErrorMessage(null);
    setState('COLLECTING_EVIDENCE');
  };

  const handleCancel = () => {
    setErrorMessage(null);
    setState('IDLE');
  };

  const handlePrepare = async () => {
    if (!isEvidenceValid || state === 'REQUESTING') return;

    setState('REQUESTING');
    setErrorMessage(null);

    try {
      const response = await recommendationSource.assistDailyEvaluation({
        planningId,
        dayOfWeek,
        humanEvidence: {
          activitiesDevelopment: devTrimmed,
          groupResponse: respTrimmed,
          ...(adapTrimmed.length > 0 ? { adaptations: adapTrimmed } : {}),
          ...(contTrimmed.length > 0 ? { continuity: contTrimmed } : {}),
        },
      });

      setSuggestion(response.suggestedEvaluation);
      setState('SUGGESTION_AVAILABLE');
    } catch (_err: unknown) {
      // Safe fallback: preserve human evidence inputs and show safe message
      setErrorMessage(
        'No fue posible generar la sugerencia en este momento. Puedes continuar redactando tu evaluación manualmente.'
      );
      setState('ERROR');
    }
  };

  const handleUse = () => {
    if (!suggestion) return;
    const acceptedText = suggestion;
    setSuggestion(null);
    setState('IDLE');
    onAccept(acceptedText);
  };

  const handleEdit = () => {
    if (!suggestion) return;
    const editText = suggestion;
    setSuggestion(null);
    setState('IDLE');
    onEdit(editText);
    if (textareaRef && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleDiscard = () => {
    setSuggestion(null);
    setState('IDLE');
    if (onDiscard) {
      onDiscard();
    }
  };

  return (
    <div className="my-4" data-testid="daily-evaluation-human-gate">
      {state === 'IDLE' && (
        <div>
          <button
            type="button"
            onClick={handleOpenForm}
            className="bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary border border-brand-secondary/30 font-bold px-4 py-2.5 rounded-full shadow-sm transition flex items-center gap-2 text-sm"
          >
            <span>✨</span> Ayúdame a redactar mi evaluación
          </button>
        </div>
      )}

      {(state === 'COLLECTING_EVIDENCE' || state === 'REQUESTING' || state === 'ERROR') && (
        <div className="border border-brand-secondary/30 bg-teal-50/40 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-teal-200/60 pb-2">
            <div>
              <h6 className="text-sm font-bold text-teal-900 flex items-center gap-2">
                <span>✨</span> Asistente de Redacción Pedagógica
              </h6>
              <p className="text-xs text-text-muted mt-0.5">
                Proporciona tus observaciones directas del aula para preparar un borrador sugerido. La IA propone, tú decides.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              disabled={state === 'REQUESTING'}
              className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 rounded transition disabled:opacity-30"
              aria-label="Cerrar asistente"
            >
              ✕
            </button>
          </div>

          <div className="mb-3 p-2.5 bg-white/70 border border-teal-100 rounded-lg text-xs text-teal-800">
            💡 Registra observaciones a nivel grupal de manera objetiva y sin identificadores personales.
          </div>

          {state === 'ERROR' && errorMessage && (
            <div
              role="alert"
              className="p-3 mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-2"
            >
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="evidence-activities-development"
                  className="text-xs font-bold text-teal-900"
                >
                  ¿Cómo se desarrollaron las actividades de este día?{' '}
                  <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    activitiesDevelopment.length > 600 || (activitiesDevelopment.length > 0 && devTrimmed.length < 15)
                      ? 'text-red-600 font-bold'
                      : 'text-gray-500'
                  }`}
                >
                  {activitiesDevelopment.length}/600 (mín. 15)
                </span>
              </div>
              <textarea
                id="evidence-activities-development"
                aria-label="¿Cómo se desarrollaron las actividades de este día?"
                disabled={state === 'REQUESTING'}
                value={activitiesDevelopment}
                onChange={(e) => setActivitiesDevelopment(e.target.value)}
                placeholder="Describe de forma objetiva cómo se llevaron a cabo las experiencias..."
                className="w-full text-xs p-3 bg-white border border-teal-200 focus:border-brand-primary rounded-lg outline-none min-h-[72px] resize-y transition shadow-inner disabled:bg-gray-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="evidence-group-response"
                  className="text-xs font-bold text-teal-900"
                >
                  ¿Qué observaste en la respuesta del grupo?{' '}
                  <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    groupResponse.length > 600 || (groupResponse.length > 0 && respTrimmed.length < 15)
                      ? 'text-red-600 font-bold'
                      : 'text-gray-500'
                  }`}
                >
                  {groupResponse.length}/600 (mín. 15)
                </span>
              </div>
              <textarea
                id="evidence-group-response"
                aria-label="¿Qué observaste en la respuesta del grupo?"
                disabled={state === 'REQUESTING'}
                value={groupResponse}
                onChange={(e) => setGroupResponse(e.target.value)}
                placeholder="Describe la respuesta, interés y participación del grupo..."
                className="w-full text-xs p-3 bg-white border border-teal-200 focus:border-brand-primary rounded-lg outline-none min-h-[72px] resize-y transition shadow-inner disabled:bg-gray-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="evidence-adaptations"
                  className="text-xs font-bold text-teal-900"
                >
                  ¿Realizaste algún ajuste durante las actividades?{' '}
                  <span className="text-gray-400 font-normal">(Opcional)</span>
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    adaptations.length > 400 ? 'text-red-600 font-bold' : 'text-gray-500'
                  }`}
                >
                  {adaptations.length}/400
                </span>
              </div>
              <textarea
                id="evidence-adaptations"
                aria-label="¿Realizaste algún ajuste durante las actividades?"
                disabled={state === 'REQUESTING'}
                value={adaptations}
                onChange={(e) => setAdaptations(e.target.value)}
                placeholder="Ajustes realizados en mediación, ambiente o materiales..."
                className="w-full text-xs p-3 bg-white border border-teal-200 focus:border-brand-primary rounded-lg outline-none min-h-[56px] resize-y transition shadow-inner disabled:bg-gray-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="evidence-continuity"
                  className="text-xs font-bold text-teal-900"
                >
                  ¿Hay algo que consideres importante retomar o continuar?{' '}
                  <span className="text-gray-400 font-normal">(Opcional)</span>
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    continuity.length > 400 ? 'text-red-600 font-bold' : 'text-gray-500'
                  }`}
                >
                  {continuity.length}/400
                </span>
              </div>
              <textarea
                id="evidence-continuity"
                aria-label="¿Hay algo que consideres importante retomar o continuar?"
                disabled={state === 'REQUESTING'}
                value={continuity}
                onChange={(e) => setContinuity(e.target.value)}
                placeholder="Aspectos a continuar o profundizar en próximas sesiones..."
                className="w-full text-xs p-3 bg-white border border-teal-200 focus:border-brand-primary rounded-lg outline-none min-h-[56px] resize-y transition shadow-inner disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-teal-200/60 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={state === 'REQUESTING'}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md transition disabled:opacity-40"
            >
              Cancelar
            </button>

            {state === 'REQUESTING' ? (
              <div className="flex items-center gap-2 text-xs font-medium text-teal-800 py-1.5 px-3">
                <span className="animate-spin inline-block">⏳</span> Preparando borrador sugerido...
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePrepare}
                disabled={!isEvidenceValid}
                className="bg-brand-primary hover:bg-brand-dark text-white font-bold px-4 py-2 rounded-full shadow-sm transition flex items-center gap-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>✨</span> Preparar borrador sugerido
              </button>
            )}
          </div>
        </div>
      )}

      {state === 'SUGGESTION_AVAILABLE' && suggestion && (
        <div
          className="border-2 border-brand-secondary/40 bg-teal-50/60 rounded-xl p-5 shadow-sm"
          data-testid="suggestion-review-surface"
        >
          <div className="flex items-center justify-between mb-3 border-b border-teal-200 pb-2">
            <span className="text-xs font-bold text-brand-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span>✨</span> Sugerencia de evaluación generada
            </span>
            <span className="text-[11px] font-medium text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-full">
              Borrador transitorio — No guardado
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            Revisa la redacción propuesta. Puedes usarla tal cual en tu evaluación, continuar editándola, o descartarla.
          </p>
          <div className="text-sm text-gray-900 leading-relaxed font-medium whitespace-pre-wrap bg-white p-4 rounded-lg border border-teal-200 shadow-inner mb-4 min-h-[80px]">
            {suggestion}
          </div>
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleDiscard}
              className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-bold px-4 py-2 rounded-full text-xs transition shadow-sm"
            >
              DESCARTAR
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="bg-white hover:bg-teal-50 border border-brand-secondary text-brand-secondary font-bold px-4 py-2 rounded-full text-xs transition flex items-center gap-1 shadow-sm"
            >
              <span>✏️</span> EDITAR
            </button>
            <button
              type="button"
              onClick={handleUse}
              className="bg-brand-primary hover:bg-brand-dark text-white font-bold px-5 py-2 rounded-full text-xs shadow-sm transition flex items-center gap-1"
            >
              <span>✓</span> USAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
