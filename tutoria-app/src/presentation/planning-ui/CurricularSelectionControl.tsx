import React, { useState } from "react";
import {
  DIRECT_PDA_CATALOG,
  DIRECT_PDA_CATALOG_BY_ID,
  TUTORIA_DIRECT_PDA_CATALOG_REVISION,
  DirectPDAEntry,
} from "../../domain/planning/DirectCurricularCatalog";
import { CurricularPDAReference } from "../../domain/planning/CurricularPDAReference";
import { PlanningActivity, WeeklyPlanning } from "../../domain/planning/WeeklyPlanning";
import {
  CurricularRecommendation,
  CurricularRecommendationService,
  CurricularRecommendationSource,
} from "../../application/planning/CurricularRecommendationSource";
import { DeterministicCurricularRecommendationSource } from "../../application/planning/DeterministicCurricularRecommendationSource";

export interface CurricularSelectionControlProps {
  activity: PlanningActivity;
  dayIdentifier: string;
  planning: WeeklyPlanning;
  readOnly?: boolean;
  modality?: "DIRECT" | "INDIRECT";
  recommendationSource?: CurricularRecommendationSource;
  onUpdate?: (updatedRefs: CurricularPDAReference[]) => void | Promise<void>;
}

export const CurricularSelectionControl: React.FC<CurricularSelectionControlProps> = ({
  activity,
  dayIdentifier,
  planning,
  readOnly = false,
  modality = "DIRECT",
  recommendationSource,
  onUpdate,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activeCampo, setActiveCampo] = useState<string>("Lenguajes");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Transient recommendation state (F.8.2) - NEVER persisted in domain model or Firestore
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<readonly CurricularRecommendation[] | null>(null);
  const [suggestionServiceError, setSuggestionServiceError] = useState<string | null>(null);

  const isDirect = modality === "DIRECT";

  const selectedRefs = activity.curricularTraceability || [];
  const selectedIds = new Set(selectedRefs.map((r) => r.pdaId));

  // Distinct Campos
  const campos = Array.from(new Set(DIRECT_PDA_CATALOG.map((e) => e.campoFormativo)));

  // Filter catalog by active Campo
  const entriesInActiveCampo = DIRECT_PDA_CATALOG.filter((e) => e.campoFormativo === activeCampo);

  // Group by Contenido within active Campo
  const groupedByContenido = entriesInActiveCampo.reduce((acc, entry) => {
    if (!acc[entry.contenido]) {
      acc[entry.contenido] = [];
    }
    acc[entry.contenido]!.push(entry);
    return acc;
  }, {} as Record<string, DirectPDAEntry[]>);

  const applyReferences = async (newRefs: CurricularPDAReference[]): Promise<boolean> => {
    const previousRefs = activity.curricularTraceability || [];
    try {
      setErrorMessage(null);
      // Authoritative domain update
      planning.setActivityCurricularTraceability(dayIdentifier, activity.activityId, newRefs);
      if (onUpdate) {
        await onUpdate(newRefs);
      }
      return true;
    } catch (err: any) {
      // Roll back in-memory domain state on persistence failure to maintain atomicity
      try {
        planning.setActivityCurricularTraceability(dayIdentifier, activity.activityId, previousRefs);
      } catch {
        // ignore rollback errors
      }
      setErrorMessage(err.message || "Error al actualizar elementos curriculares.");
      return false;
    }
  };

  const handleTogglePDA = async (pdaId: string) => {
    if (readOnly) return;
    if (selectedIds.has(pdaId)) {
      const newRefs = selectedRefs.filter((r) => r.pdaId !== pdaId);
      await applyReferences(newRefs);
    } else {
      const newRefs: CurricularPDAReference[] = [
        ...selectedRefs,
        { pdaId, catalogRevision: TUTORIA_DIRECT_PDA_CATALOG_REVISION },
      ];
      await applyReferences(newRefs);
    }
  };

  const handleRemovePDA = async (pdaId: string) => {
    if (readOnly) return;
    const newRefs = selectedRefs.filter((r) => r.pdaId !== pdaId);
    await applyReferences(newRefs);
  };

  const handleClearAll = async () => {
    if (readOnly) return;
    await applyReferences([]);
  };

  const handleRequestSuggestions = async () => {
    if (readOnly || !isDirect) return;
    setIsLoadingSuggestions(true);
    setSuggestionServiceError(null);
    try {
      const source = recommendationSource || new DeterministicCurricularRecommendationSource();
      const service = new CurricularRecommendationService(source);
      const results = await service.getRecommendations({
        activityId: activity.activityId,
        activityTitle: activity.objective,
        modality: "DIRECT",
        description: activity.description,
        category: activity.category,
      });
      setSuggestions(results);
    } catch (err: any) {
      setSuggestionServiceError(
        "No fue posible obtener sugerencias curriculares. Puedes continuar con la selección manual."
      );
      setSuggestions(null);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleAcceptSuggestion = async (rec: CurricularRecommendation) => {
    if (readOnly || !isDirect) return;
    if (selectedIds.has(rec.reference.pdaId)) return; // Prevent duplicate
    const newRefs: CurricularPDAReference[] = [
      ...selectedRefs,
      rec.reference,
    ];
    await applyReferences(newRefs);
  };

  return (
    <div className="mt-4 pt-4 border-t border-teal-100/60" data-testid={`curricular-section-${activity.activityId}`}>
      <div className="flex items-center justify-between mb-3">
        <h6 className="text-sm font-bold text-teal-950 uppercase tracking-wider flex items-center gap-2">
          <span>🎯</span> Elementos curriculares
        </h6>
        {!readOnly && (
          <div className="flex items-center gap-2">
            {isDirect && (
              <button
                type="button"
                onClick={handleRequestSuggestions}
                disabled={isLoadingSuggestions}
                className="text-xs font-bold text-teal-800 hover:text-teal-950 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
                aria-label="Sugerir elementos curriculares"
              >
                <span>✨</span> {isLoadingSuggestions ? "Buscando sugerencias..." : "Sugerir elementos curriculares"}
              </button>
            )}
            {selectedRefs.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-semibold text-rose-700 hover:text-rose-900 px-2.5 py-1 rounded bg-rose-50 border border-rose-200 transition"
                aria-label={`Limpiar todos los elementos curriculares de ${activity.objective}`}
              >
                Limpiar todo
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="text-xs font-bold text-teal-800 hover:text-teal-950 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 shadow-xs flex items-center gap-1.5 transition"
              aria-label={isPickerOpen ? "Cerrar catálogo curricular" : "Seleccionar del catálogo curricular"}
              aria-expanded={isPickerOpen}
            >
              {isPickerOpen ? "✕ Cerrar catálogo" : "＋ Seleccionar del catálogo"}
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold" data-testid="curricular-error-message">
          {errorMessage}
        </div>
      )}

      {/* Suggestion Service Error State (Non-blocking) */}
      {!readOnly && isDirect && suggestionServiceError && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-medium" data-testid="suggestion-service-error">
          {suggestionServiceError}
        </div>
      )}

      {/* Zero suggestions state */}
      {!readOnly && isDirect && suggestions !== null && suggestions.length === 0 && !suggestionServiceError && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 font-medium" data-testid="zero-suggestions-message">
          No se encontraron sugerencias curriculares para esta actividad.
        </div>
      )}

      {/* Suggestions Panel (Transient) */}
      {!readOnly && isDirect && suggestions !== null && suggestions.length > 0 && (
        <div
          className="mb-4 p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-3 animate-fade-in"
          data-testid={`suggestions-panel-${activity.activityId}`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-teal-100">
            <h6 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>✨</span> Sugerencias de TutorIA
            </h6>
            <button
              type="button"
              onClick={() => setSuggestions(null)}
              className="text-xs text-teal-700 hover:text-teal-950 underline font-medium"
              aria-label="Cerrar sugerencias"
            >
              Ocultar
            </button>
          </div>

          <div className="space-y-2.5">
            {suggestions.map((rec) => {
              const entry = DIRECT_PDA_CATALOG_BY_ID.get(rec.reference.pdaId);
              const isAccepted = selectedIds.has(rec.reference.pdaId);

              return (
                <div
                  key={rec.reference.pdaId}
                  className="p-3 bg-white border border-teal-200/80 rounded-lg flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-2xs"
                  data-testid={`suggestion-item-${rec.reference.pdaId}`}
                >
                  <div className="space-y-1.5 flex-1 text-left">
                    {entry && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-2xs font-bold uppercase tracking-wider px-1.5 py-0.5 bg-teal-100 text-teal-900 rounded">
                          {entry.campoFormativo}
                        </span>
                        <span className="text-xs font-semibold text-teal-950">
                          {entry.contenido.trim()}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-gray-800 font-normal leading-relaxed">
                      {entry ? entry.pda : "Elemento curricular"}
                    </p>
                    {rec.rationale && (
                      <p className="text-xs text-teal-800/90 italic bg-teal-50/50 p-1.5 rounded border border-teal-100">
                        <span className="font-semibold not-italic">Justificación: </span>
                        {rec.rationale}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 self-end sm:self-center">
                    {isAccepted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200">
                        ✓ Agregada
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAcceptSuggestion(rec)}
                        className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1"
                        aria-label={`Aceptar sugerencia: ${entry ? entry.pda : ""}`}
                      >
                        Aceptar sugerencia
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Items List */}
      {selectedRefs.length === 0 ? (
        <p className="text-sm text-gray-500 italic py-1">
          Sin elementos curriculares seleccionados.
        </p>
      ) : (
        <div className="space-y-2 mb-3">
          {selectedRefs.map((ref) => {
            const entry = DIRECT_PDA_CATALOG_BY_ID.get(ref.pdaId);
            if (!entry) return null;
            return (
              <div
                key={ref.pdaId}
                className="p-3 bg-teal-50/50 border border-teal-200/80 rounded-lg text-left flex items-start justify-between gap-3 shadow-2xs"
                data-testid={`selected-pda-${ref.pdaId}`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xs font-bold uppercase tracking-wider px-2 py-0.5 bg-teal-200/70 text-teal-900 rounded">
                      {entry.campoFormativo}
                    </span>
                    <span className="text-xs font-semibold text-teal-900">
                      {entry.contenido.trim()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 font-normal leading-relaxed">
                    {entry.pda}
                  </p>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemovePDA(ref.pdaId)}
                    className="text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-100/50 rounded transition flex-shrink-0"
                    aria-label={`Eliminar elemento curricular: ${entry.pda}`}
                    title="Eliminar elemento curricular"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Grouped Catalog Selector Picker Modal/Accordion */}
      {isPickerOpen && !readOnly && (
        <div
          className="mt-3 p-4 bg-white border-2 border-teal-300 rounded-xl shadow-md animate-fade-in-up"
          data-testid="curricular-picker-panel"
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <div>
              <span className="font-bold text-sm text-teal-900 block">
                Catálogo Oficial de Procesos de Desarrollo de Aprendizaje (PDA)
              </span>
              <span className="text-xs text-gray-500">
                Selecciona uno o más elementos curriculares correspondientes a esta actividad pedagógica.
              </span>
            </div>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
              {selectedRefs.length} seleccionados
            </span>
          </div>

          {/* Campo Formativo Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-4" role="tablist" aria-label="Campos Formativos">
            {campos.map((campo) => {
              const isActive = campo === activeCampo;
              const countInCampo = DIRECT_PDA_CATALOG.filter(
                (e) => e.campoFormativo === campo && selectedIds.has(e.id)
              ).length;

              return (
                <button
                  key={campo}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveCampo(campo)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                    isActive
                      ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <span>{campo}</span>
                  {countInCampo > 0 && (
                    <span
                      className={`text-2xs font-bold px-1.5 py-0.2 rounded-full ${
                        isActive ? "bg-white text-teal-800" : "bg-teal-600 text-white"
                      }`}
                    >
                      {countInCampo}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Grouped Contenidos & PDAs within Active Campo */}
          <div className="max-h-[380px] overflow-y-auto space-y-4 pr-1">
            {Object.entries(groupedByContenido).map(([contenido, pdaList]) => (
              <div
                key={contenido}
                className="p-3.5 bg-surface-soft border border-border-soft rounded-lg space-y-2.5"
              >
                <span className="text-xs font-bold text-teal-900 block border-b border-teal-100 pb-1.5 uppercase tracking-wide">
                  Contenido: {contenido}
                </span>
                <div className="space-y-2">
                  {pdaList.map((entry) => {
                    const isSelected = selectedIds.has(entry.id);
                    const checkboxId = `pda-check-${activity.activityId}-${entry.id}`;

                    return (
                      <label
                        key={entry.id}
                        htmlFor={checkboxId}
                        className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition text-left block ${
                          isSelected
                            ? "bg-teal-50/90 border-teal-400 shadow-2xs"
                            : "bg-white border-gray-200 hover:border-teal-200 hover:bg-teal-50/20"
                        }`}
                      >
                        <input
                          type="checkbox"
                          id={checkboxId}
                          checked={isSelected}
                          onChange={() => handleTogglePDA(entry.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 flex-shrink-0 cursor-pointer"
                          aria-label={`Seleccionar PDA: ${entry.pda}`}
                        />
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-gray-900 leading-snug">
                            {entry.pda}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={() => setIsPickerOpen(false)}
              className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
