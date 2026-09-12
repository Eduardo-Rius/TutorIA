import React, { useState } from 'react';
import type { PrioritizedPractice } from '../../domain/planning/PrioritizedPractice';
import type { WeeklyPlanning } from '../../domain/planning/WeeklyPlanning';

export interface PrioritizedPracticesControlProps {
  dayOfWeek: string;
  practices: readonly PrioritizedPractice[];
  planning?: WeeklyPlanning;
  readOnly?: boolean;
  onSave: (updatedPractices: PrioritizedPractice[]) => Promise<void>;
}

export const PrioritizedPracticesControl: React.FC<PrioritizedPracticesControlProps> = ({
  dayOfWeek,
  practices = [],
  readOnly = false,
  onSave,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form fields state
  const [practiceName, setPracticeName] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setPracticeName('');
    setSourceReference('');
    setValidationError(null);
    setEditingIndex(null);
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = practices[index];
    if (!item) return;
    setPracticeName(item.practiceName || '');
    setSourceReference(item.sourceReference || '');
    setValidationError(null);
    setEditingIndex(index);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = practiceName.trim();
    if (!trimmedName) {
      setValidationError('La práctica indicada es obligatoria.');
      return;
    }

    const trimmedRef = sourceReference.trim();
    const newPractice: PrioritizedPractice = {
      practiceName: trimmedName,
      ...(trimmedRef ? { sourceReference: trimmedRef } : {}),
    };

    let updatedList: PrioritizedPractice[];
    if (editingIndex !== null) {
      updatedList = practices.map((item, idx) => (idx === editingIndex ? newPractice : item));
    } else {
      updatedList = [...practices, newPractice];
    }

    try {
      setIsSaving(true);
      await onSave(updatedList);
      resetForm();
    } catch (err: any) {
      setValidationError(err.message || 'Error al guardar la práctica priorizada.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (index: number) => {
    if (readOnly) return;
    setValidationError(null);
    const updatedList = practices.filter((_, idx) => idx !== index);
    try {
      setIsSaving(true);
      await onSave(updatedList);
      if (editingIndex === index) {
        resetForm();
      }
    } catch (err: any) {
      setValidationError(err.message || 'Error al eliminar la práctica priorizada.');
    } finally {
      setIsSaving(false);
    }
  };

  const isEditable = !readOnly;

  return (
    <div
      className="mt-8 pt-6 border-t border-border-soft"
      data-testid={`prioritized-practices-control-${dayOfWeek}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-lg font-bold text-teal-900 flex items-center gap-2">
          <span>🎯</span> Prácticas priorizadas
        </h5>
        <span className="text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full uppercase tracking-wider">
          Instrucción institucional
        </span>
      </div>

      <p className="text-sm text-text-muted mb-4 font-medium leading-relaxed">
        Registra este apartado únicamente cuando exista una práctica indicada mediante acompañamiento, asesoría o instrucción institucional.
      </p>

      {validationError && (
        <div
          role="alert"
          className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm font-semibold flex items-center gap-2"
        >
          <span>⚠️</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* Empty State */}
      {practices.length === 0 && !isFormOpen && (
        <div className="bg-surface-soft border border-border-soft rounded-xl p-5 text-center">
          <p className="text-text-primary font-bold text-base mb-3">
            Sin práctica priorizada registrada para este día.
          </p>
          {isEditable && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-lg shadow-xs transition"
            >
              <span>＋</span> Agregar práctica priorizada
            </button>
          )}
        </div>
      )}

      {/* Existing Entries List */}
      {practices.length > 0 && (
        <div className="space-y-4 mb-4">
          {practices.map((practice, idx) => (
            <div
              key={idx}
              className="bg-white border border-border-soft rounded-xl p-5 shadow-xs transition hover:border-teal-200"
              data-testid={`prioritized-practice-entry-${idx}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Práctica priorizada
                  </span>
                  {practice.sourceReference && (
                    <span className="text-xs text-text-muted font-medium">
                      Referencia: {practice.sourceReference}
                    </span>
                  )}
                </div>
                {isEditable && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(idx)}
                      disabled={isSaving}
                      className="text-xs font-bold text-teal-700 hover:text-teal-900 px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 border border-teal-200 transition"
                      aria-label={`Editar ${practice.practiceName}`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      disabled={isSaving}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                      aria-label={`Eliminar ${practice.practiceName}`}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>

              <h6 className="font-bold text-text-primary text-lg mb-1">
                {practice.practiceName}
              </h6>
            </div>
          ))}

          {isEditable && !isFormOpen && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-sm rounded-lg border border-teal-200 transition shadow-2xs"
              >
                <span>＋</span> Agregar otra práctica priorizada
              </button>
            </div>
          )}
        </div>
      )}

      {/* Entry / Edit Form */}
      {isFormOpen && isEditable && (
        <form
          onSubmit={handleFormSubmit}
          className="mt-4 p-5 bg-white border-2 border-teal-300 rounded-xl shadow-md space-y-4 animate-fade-in"
          data-testid="prioritized-practice-form"
        >
          <div className="border-b border-gray-100 pb-2">
            <h6 className="text-sm font-bold text-teal-950 uppercase tracking-wide">
              {editingIndex !== null ? 'Editar práctica priorizada' : 'Nueva práctica priorizada'}
            </h6>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Práctica indicada *
            </label>
            <input
              type="text"
              value={practiceName}
              onChange={(e) => setPracticeName(e.target.value)}
              placeholder="Ej. Interacción sensible y responsiva, Acompañamiento en lectura..."
              aria-label="Práctica indicada"
              className="w-full text-sm p-3 border border-border-default rounded-lg outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Referencia de la instrucción (opcional)
            </label>
            <input
              type="text"
              value={sourceReference}
              onChange={(e) => setSourceReference(e.target.value)}
              placeholder="Ej. Asesoría Técnico Pedagógica, Seguimiento institucional..."
              aria-label="Referencia de la instrucción (opcional)"
              className="w-full text-sm p-3 border border-border-default rounded-lg outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold text-text-muted hover:text-text-primary rounded-lg hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-sm font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : (editingIndex !== null ? 'Guardar cambios' : 'Guardar práctica')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
