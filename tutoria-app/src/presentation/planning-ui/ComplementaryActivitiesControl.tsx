import React, { useState } from 'react';
import type { ComplementaryProgramActivity } from '../../domain/planning/ComplementaryProgramActivity';
import type { WeeklyPlanning } from '../../domain/planning/WeeklyPlanning';

export interface ComplementaryActivitiesControlProps {
  dayOfWeek: string;
  activities: ComplementaryProgramActivity[];
  planning?: WeeklyPlanning;
  readOnly?: boolean;
  onSave: (updatedActivities: ComplementaryProgramActivity[]) => Promise<void>;
}

export const ComplementaryActivitiesControl: React.FC<ComplementaryActivitiesControlProps> = ({
  dayOfWeek,
  activities = [],
  readOnly = false,
  onSave,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form fields state
  const [programArea, setProgramArea] = useState('');
  const [activityName, setActivityName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setProgramArea('');
    setActivityName('');
    setPurpose('');
    setDescription('');
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
    const item = activities[index];
    if (!item) return;
    setProgramArea(item.programArea || '');
    setActivityName(item.activityName || '');
    setPurpose(item.purpose || '');
    setDescription(item.description || '');
    setSourceReference(item.sourceReference || '');
    setValidationError(null);
    setEditingIndex(index);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedProgram = programArea.trim();
    const trimmedActivity = activityName.trim();

    if (!trimmedProgram || !trimmedActivity) {
      setValidationError('El programa o instrucción y la actividad indicada son obligatorios.');
      return;
    }

    const newActivity: ComplementaryProgramActivity = {
      programArea: trimmedProgram,
      activityName: trimmedActivity,
      ...(purpose.trim() ? { purpose: purpose.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(sourceReference.trim() ? { sourceReference: sourceReference.trim() } : {}),
    };

    let updatedList: ComplementaryProgramActivity[];
    if (editingIndex !== null) {
      updatedList = activities.map((item, idx) => (idx === editingIndex ? newActivity : item));
    } else {
      updatedList = [...activities, newActivity];
    }

    try {
      setIsSaving(true);
      await onSave(updatedList);
      resetForm();
    } catch (err: any) {
      setValidationError(err.message || 'Error al guardar la actividad complementaria.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (index: number) => {
    if (readOnly) return;
    setValidationError(null);
    const updatedList = activities.filter((_, idx) => idx !== index);
    try {
      setIsSaving(true);
      await onSave(updatedList);
    } catch (err: any) {
      setValidationError(err.message || 'Error al eliminar la actividad complementaria.');
    } finally {
      setIsSaving(false);
    }
  };

  const isEditable = !readOnly;

  return (
    <div className="mt-8 pt-6 border-t border-border-soft" data-testid={`complementary-control-${dayOfWeek}`}>
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-lg font-bold text-teal-900 flex items-center gap-2">
          <span>🧩</span> Actividades complementarias de otros programas
        </h5>
        <span className="text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full uppercase tracking-wider">
          Programa institucional
        </span>
      </div>

      <p className="text-sm text-text-muted mb-4 font-medium leading-relaxed">
        Registra este apartado únicamente cuando exista una actividad indicada por otro programa o instrucción institucional.
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
      {activities.length === 0 && !isFormOpen && (
        <div className="bg-surface-soft border border-border-soft rounded-xl p-5 text-center">
          <p className="text-text-primary font-bold text-base mb-3">
            Sin actividad complementaria registrada para este día.
          </p>
          {isEditable && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-lg shadow-xs transition"
            >
              <span>＋</span> Agregar actividad complementaria
            </button>
          )}
        </div>
      )}

      {/* Existing Entries List */}
      {activities.length > 0 && (
        <div className="space-y-4 mb-4">
          {activities.map((ca, idx) => (
            <div
              key={idx}
              className="bg-white border border-border-soft rounded-xl p-5 shadow-xs transition hover:border-teal-200"
              data-testid={`complementary-entry-${idx}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {ca.programArea}
                  </span>
                  {ca.sourceReference && (
                    <span className="text-xs text-text-muted font-medium">
                      Fuente: {ca.sourceReference}
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
                      aria-label={`Editar ${ca.activityName}`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      disabled={isSaving}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                      aria-label={`Eliminar ${ca.activityName}`}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>

              <h6 className="font-bold text-text-primary text-lg mb-1">
                {ca.activityName}
              </h6>

              {ca.purpose && (
                <p className="text-sm font-semibold text-teal-900 mb-1">
                  <strong>Propósito:</strong> {ca.purpose}
                </p>
              )}

              {ca.description && (
                <p className="text-sm text-gray-700 leading-relaxed font-normal">
                  {ca.description}
                </p>
              )}
            </div>
          ))}

          {isEditable && !isFormOpen && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-sm rounded-lg border border-teal-200 transition shadow-2xs"
              >
                <span>＋</span> Agregar otra actividad complementaria
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
          data-testid="complementary-activity-form"
        >
          <div className="border-b border-gray-100 pb-2">
            <h6 className="text-sm font-bold text-teal-950 uppercase tracking-wide">
              {editingIndex !== null ? 'Editar actividad complementaria' : 'Nueva actividad complementaria'}
            </h6>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Programa o instrucción *
            </label>
            <input
              type="text"
              value={programArea}
              onChange={(e) => setProgramArea(e.target.value)}
              placeholder="Ej. Programa de estimulación específico, Seguimiento de salud..."
              className="w-full text-sm p-3 border border-border-default rounded-lg outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Actividad indicada *
            </label>
            <input
              type="text"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              placeholder="Ej. Ejercicio de seguimiento motor, Monitoreo de deglución..."
              className="w-full text-sm p-3 border border-border-default rounded-lg outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Propósito (opcional)
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Ej. Fortalecer motricidad fina según indicación médica"
              className="w-full text-sm p-3 border border-border-default rounded-lg outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles sobre el procedimiento, materiales específicos o adaptaciones..."
              rows={3}
              className="w-full text-sm p-3 border border-border-default rounded-lg outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition resize-y"
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
              placeholder="Ej. Oficio No. 34/2026, Bitácora de seguimiento"
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
              {isSaving ? 'Guardando...' : (editingIndex !== null ? 'Guardar cambios' : 'Guardar actividad')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
