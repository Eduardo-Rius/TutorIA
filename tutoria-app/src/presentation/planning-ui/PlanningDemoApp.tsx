import { logos } from '../../theme/logos';
import { personas } from '../../theme/personas';
import React, { useState, useEffect, useRef } from 'react';
import { PlanningActorRole, PlanningWorkflowService } from '../../application/planning/PlanningWorkflowService';
import { PedagogicalRecommendationSource } from '../../application/planning/PedagogicalRecommendationSource';
import { WeeklyPlanning, PlanningDay } from '../../domain/planning/WeeklyPlanning';
import { RoomCatalog } from '../../domain/planning/RoomCatalog';

const MOCK_START = '2026-08-10';
const MOCK_END = '2026-08-14';

const LOADING_MESSAGES = [
  "Estoy leyendo tus observaciones...",
  "Estoy buscando actividades sugeridas para su edad...",
  "Estoy preparando la propuesta...",
  "Estoy organizando la semana..."
];

const DAY_CONTEXT: Record<string, string> = {
  'MONDAY': 'Comenzamos despertando curiosidad.',
  'TUESDAY': 'Ahora profundizamos la exploración.',
  'WEDNESDAY': 'Fortalecemos la confianza.',
  'THURSDAY': 'Invitamos a crear.',
  'FRIDAY': 'Cerramos celebrando los logros.'
};

const VISUAL_STEPS = [
  'Conocer al grupo',
  'Construir la propuesta',
  'Revisarla juntas',
  'Compartirla'
];

export interface PlanningDemoAppProps {
  service: PlanningWorkflowService;
  source: PedagogicalRecommendationSource;
}

export const PlanningDemoApp: React.FC<PlanningDemoAppProps> = ({ service, source }) => {
  const [role, setRole] = useState<PlanningActorRole>('TEACHER');
  const [view, setView] = useState<'LIST' | 'CREATE' | 'REVIEW' | 'PRINT'>('LIST');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modality, setModality] = useState<'DIRECT' | 'INDIRECT'>('DIRECT');

  const triggerRefresh = () => setRefreshKey(k => k + 1);

  if (view === 'PRINT') {
    return (
      <div className="bg-white">
        <PrintableView service={service} planId={selectedPlanId!} modality={modality} onBack={() => setView(role === 'SUPERVISOR' ? 'REVIEW' : (role === 'DIRECTOR' ? 'REVIEW' : 'CREATE'))} />
      </div>
    );
  }

  return (
    <div className="font-poppins text-text-primary min-h-screen bg-surface-soft pb-20 print:hidden">
      <div className="bg-[#f8f9fa] py-1.5 px-4 text-center text-xs print:hidden flex items-center justify-center gap-4 border-b border-gray-200/60">
        <span className="font-medium text-gray-400 uppercase tracking-widest text-[10px]">Modo Demo</span>
        <select value={modality} onChange={(e) => setModality(e.target.value as 'DIRECT' | 'INDIRECT')} className="text-xs bg-white border border-gray-300 rounded px-2 py-1 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary">
          <option value="DIRECT">Prestación Directa (LAB)</option>
          <option value="INDIRECT">Prestación Indirecta (LAB)</option>
        </select>
        <button onClick={() => { setRole('TEACHER'); setView('LIST'); }} className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-2 ${role === 'TEACHER' ? 'bg-role-teacher text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'}`}>
          <img src={personas.anita} alt="Anita" className="w-6 h-6 rounded-full object-cover bg-white/20" />
          Anita (Pedagoga)
        </button>
        <button onClick={() => { setRole('DIRECTOR'); setView('LIST'); }} className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-2 ${role === 'DIRECTOR' ? 'bg-role-director text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'}`}>
          <img src={personas.ceci} alt="Ceci" className="w-6 h-6 rounded-full object-cover bg-white/20" />
          Ceci (Directora)
        </button>
        <button onClick={() => { setRole('SUPERVISOR'); setView('LIST'); }} className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-2 ${role === 'SUPERVISOR' ? 'bg-role-supervisor text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'}`}>
          <img src={personas.tere} alt="Tere" className="w-6 h-6 rounded-full object-cover bg-white/20" />
          Tere (Supervisora)
        </button>
      </div>

      <div className="py-4 mb-8 bg-surface-warm print:hidden border-b border-border-soft relative">
        <div className="max-w-6xl mx-auto w-full px-4 flex flex-col md:flex-row items-center justify-between">
          <div className="w-full md:w-1/3 flex justify-start mb-4 md:mb-0">
            <button onClick={() => window.location.href = '/workspace'} className="flex items-center gap-2 bg-[#f9f7f2] hover:bg-white border border-[#e8e4d9] hover:border-[#d6d1c4] px-4 py-2 rounded-xl text-[#524b42] hover:text-[#3d3730] transition-all shadow-sm hover:shadow text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="m15 18-6-6 6-6"/></svg>
              Mi espacio
            </button>
          </div>
          <div className="w-full md:w-1/3 flex flex-col items-center justify-center">
            <img src={logos.imagotypeTransparent || undefined} alt="TutorIA" className="h-14 mb-2" />
          </div>
          <div className="w-full md:w-1/3 flex justify-end">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-text-primary">{role === 'TEACHER' ? 'Anita' : role === 'DIRECTOR' ? 'Ceci' : 'Tere'}</p>
                <p className="text-xs font-medium text-text-muted">{role === 'TEACHER' ? 'Pedagoga · Lactantes C' : role === 'DIRECTOR' ? 'Directora' : 'Supervisora'}</p>
              </div>
              <img src={role === 'TEACHER' ? personas.anita : role === 'DIRECTOR' ? personas.ceci : personas.tere} alt="Perfil" className="w-[128px] h-[128px] object-contain" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 print:max-w-none print:px-0">
        {role === 'TEACHER' && view === 'LIST' && <TeacherList service={service} onNew={() => setView('CREATE')} onSelect={(id) => { setSelectedPlanId(id); setView('CREATE'); }} refreshKey={refreshKey} modality={modality} />}
        {role === 'TEACHER' && view === 'CREATE' && <TeacherWizard role={role} service={service} source={source} planId={selectedPlanId} modality={modality} onBack={() => setView('LIST')} onSaved={triggerRefresh} onViewOfficial={() => setView('PRINT')} />}
        {role === 'DIRECTOR' && view === 'LIST' && <DirectorList service={service} onSelect={(id) => { setSelectedPlanId(id); setView('REVIEW'); }} refreshKey={refreshKey} />}
        {role === 'DIRECTOR' && view === 'REVIEW' && <DirectorReview service={service} planId={selectedPlanId!} onBack={() => setView('LIST')} onSaved={triggerRefresh} onViewOfficial={() => setView('PRINT')} />}
        {role === 'SUPERVISOR' && view === 'LIST' && <SupervisorList service={service} onSelect={(id) => { setSelectedPlanId(id); setView('REVIEW'); }} refreshKey={refreshKey} />}
        {role === 'SUPERVISOR' && view === 'REVIEW' && <SupervisorReview service={service} planId={selectedPlanId!} modality={modality} onBack={() => setView('LIST')} onViewOfficial={() => setView('PRINT')} />}

      </div>
    </div>
  );
};

const TeacherList = ({ service, onNew, onSelect, refreshKey, modality }: { service: PlanningWorkflowService, onNew: () => void, onSelect: (id: string) => void, refreshKey: number, modality: string }) => {
  const [plans, setPlans] = useState<WeeklyPlanning[]>([]);
  useEffect(() => { service.listTeacherPlanning('t1').then(setPlans); }, [refreshKey, service]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
      <h2 className="text-5xl font-bold mb-6 text-brand-dark tracking-tight">Hola Anita 👋</h2>
      <p className="text-2xl text-text-muted mb-8 max-w-xl leading-relaxed">
        Vamos a preparar tu semana.<br/>
        Del 10 al 14 de agosto para <span className="font-bold text-text-primary">Lactantes C</span>.<br/><span className="text-sm font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">{modality === 'DIRECT' ? 'Prestación Directa' : 'Prestación Indirecta'}</span>
      </p>

      <p className="text-sm font-medium text-brand-primary bg-surface-ivory px-6 py-3 rounded-full mb-10 shadow-sm border border-brand-primary/20">
        ✨ Podemos continuar fortaleciendo la exploración sensorial esta semana.
      </p>

      <div className="grid gap-4 w-full max-w-md">
        <button onClick={onNew} className="bg-brand-primary hover:bg-brand-dark focus:ring-4 focus:ring-brand-primary/30 text-white font-bold px-8 py-5 rounded-xl shadow-sm transition text-lg flex items-center justify-center gap-3 w-full">
          ✨ Comenzar nuestra semana
        </button>

        {plans.map(p => (
           <button key={p.planningId} onClick={() => onSelect(p.planningId)} className="bg-white border-2 border-border-soft hover:border-brand-primary focus:border-brand-primary p-5 rounded-xl shadow-sm text-left transition w-full outline-none">
             <div className="flex justify-between items-center mb-1">
               <span className="font-bold text-text-primary">
                 {p.status === 'DRAFT' && 'Trabajando en la propuesta'}
                 {p.status === 'IN_REVIEW' && 'La Directora la está leyendo'}
                 {p.status === 'REJECTED' && 'Revisar sugerencias de la Directora'}
                 {p.status === 'APPROVED' && 'Propuesta lista para usarse 🌟'}
               </span>
               {p.status === 'REJECTED' && <span className="w-3 h-3 bg-status-adjustment rounded-full"></span>}
             </div>
             <p className="text-sm text-text-muted font-medium">Continuar donde nos quedamos</p>
           </button>
        ))}
      </div>
    </div>
  );
};

const WeekDayTabs = ({ days, activeIndex, onSelect }: { days: PlanningDay[], activeIndex: number, onSelect: (idx: number) => void }) => (
  <div className="max-w-4xl mx-auto flex justify-between gap-3 mb-10 overflow-x-auto pb-4 px-2" role="tablist">
    {days.map((d, idx) => {
      const isActive = idx === activeIndex;
      const label = d.dayOfWeek === 'MONDAY' ? 'Lunes' :
                    d.dayOfWeek === 'TUESDAY' ? 'Martes' :
                    d.dayOfWeek === 'WEDNESDAY' ? 'Miércoles' :
                    d.dayOfWeek === 'THURSDAY' ? 'Jueves' : 'Viernes';
      return (
        <button
          key={d.dayOfWeek}
          role="tab"
          aria-selected={isActive}
          aria-controls={`panel-${d.dayOfWeek}`}
          onClick={() => onSelect(idx)}
          className={`flex-1 min-w-[140px] px-6 py-4 rounded-full font-bold text-lg transition border whitespace-nowrap outline-none focus:ring-4 focus:ring-brand-primary/30 ${isActive ? 'bg-brand-primary text-white border-brand-primary shadow-md ring-4 ring-brand-primary/20' : 'bg-white text-text-muted border-border-default hover:border-brand-primary/50 hover:text-brand-dark hover:bg-surface-ivory shadow-sm'}`}
        >
          {label}
        </button>
      );
    })}
  </div>
);

const normalizeMaterial = (m: string) => m.trim().toLowerCase();

const getCommonWeeklyMaterials = (days: PlanningDay[]): string[] => {
  if (days.length !== 5) return [];

  const dayMaterialSets = days.map(d => {
    const set = new Set<string>();
    const originalNames = new Map<string, string>();
    d.activities.forEach(a => {
      a.materials.forEach(m => {
        if (!m.trim()) return;
        const norm = normalizeMaterial(m);
        set.add(norm);
        if (!originalNames.has(norm)) {
          originalNames.set(norm, m.trim());
        }
      });
    });
    return { set, originalNames };
  });

  const firstDay = dayMaterialSets[0];
  if (!firstDay) return [];

  const commonNormalized = Array.from(firstDay.set).filter(norm =>
    dayMaterialSets.every(d => d.set.has(norm))
  );

  return commonNormalized.map(norm => firstDay.originalNames.get(norm)!);
};

const getDaySpecificMaterials = (day: PlanningDay, commonMaterials: string[]): string[] => {
  const commonSet = new Set(commonMaterials.map(normalizeMaterial));
  const uniqueDayMaterials = new Map<string, string>();

  day.activities.forEach(a => {
    a.materials.forEach(m => {
      if (!m.trim()) return;
      const norm = normalizeMaterial(m);
      if (!commonSet.has(norm) && !uniqueDayMaterials.has(norm)) {
        uniqueDayMaterials.set(norm, m.trim());
      }
    });
  });

  return Array.from(uniqueDayMaterials.values());
};




const TeacherWizard = ({ service, source, planId, modality, onBack, onSaved, role, onViewOfficial }: { service: PlanningWorkflowService, source: PedagogicalRecommendationSource, planId: string | null, modality: 'DIRECT'|'INDIRECT', onBack: () => void, onSaved: () => void, role: string, onViewOfficial: () => void }) => {
  const [obs, setObs] = useState('');
  const [needs, setNeeds] = useState('');
  const [specialSituations, setSpecialSituations] = useState('');
  const [availableMaterials, setAvailableMaterials] = useState('');

  const [days, setDays] = useState<PlanningDay[]>([]);
  const [status, setStatus] = useState<string>('DRAFT');
  const [granularObservations, setGranularObservations] = useState<any[]>([]);

  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  const stableIdRef = useRef(`p-demo-${Date.now()}`);
  const currentPlanId = planId || stableIdRef.current;

  const [isGenerating, setIsGenerating] = useState(false);
  const [mondayProposal, setMondayProposal] = useState<PlanningDay | null>(null);
  const [collapsedResolved, setCollapsedResolved] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (planId) {
      service.getPlanning(planId).then((p: any) => {
        if (p) {
          setObs(p.observations || '');
          setNeeds(p.identifiedNeeds || '');
          setSpecialSituations(p.specialSituations || '');
          setAvailableMaterials(p.availableMaterials || '');
          setGranularObservations(p.granularObservations || []);

          if (p.days.length === 0) {
            setDays(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'].map(d => ({
              date: '', dayOfWeek: d as PlanningDay['dayOfWeek'], activities: [], complementaryActivities: [], materials: []
            })));
          } else {
            setDays(p.days);
          }
          setStatus(p.status);
        }
      });
    } else {
      if (role === 'TEACHER') {
        service.createPlanning(currentPlanId, 'd1', 'lactantes-c', 't1', MOCK_START, MOCK_END, 'TEACHER').then(() => {
          setDays(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'].map(d => ({
            date: '', dayOfWeek: d as PlanningDay['dayOfWeek'], activities: [], complementaryActivities: [], materials: []
          })));
        });
      }
    }
  }, [planId, currentPlanId, service, role]);

  const handleRecommendMonday = async () => {
    setIsGenerating(true);
    const recommended = await source.generateRecommendation(RoomCatalog.getRoom('lactantes-c')!, obs, needs, specialSituations, availableMaterials);
    const mondayRec = recommended.find(d => d.dayOfWeek === 'MONDAY');
    if (mondayRec) {
      setTimeout(() => {
        setMondayProposal(mondayRec);
        setIsGenerating(false);
      }, process.env.NODE_ENV === 'test' ? 0 : 2000);
    }
  };

  const handleAcceptProposal = () => {
    if (mondayProposal) {
      setDays(d => d.map(day => day.dayOfWeek === 'MONDAY' ? mondayProposal : day));
      setMondayProposal(null);
    }
  };

  const handleDiscardProposal = () => {
    setMondayProposal(null);
  };

  const handleSaveDraft = async () => {
    if (days.length === 5) {
      await service.saveDraft(currentPlanId, obs, needs, specialSituations, availableMaterials, [], days, 'TEACHER');

      // Auto-update local status for UX so color changes to yellow
      const updated = await service.getPlanning(currentPlanId);
      if (updated) setGranularObservations(updated.granularObservations || []);
    }
    onSaved();
    setToastMessage('✓ Avance del día guardado.');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSubmit = async () => {
    if (status === 'REJECTED') {
      await service.resubmit(currentPlanId, obs, needs, specialSituations, availableMaterials, [], days, 'TEACHER');
    } else {
      if (days.length === 5) await service.saveDraft(currentPlanId, obs, needs, specialSituations, availableMaterials, [], days, 'TEACHER');
      await service.submit(currentPlanId, 'TEACHER');
    }
    setStatus('IN_REVIEW');
    setToastMessage('🎉 ¡Listo! Planeación enviada.');
    onSaved();
    setTimeout(() => {
      setToastMessage('');
      onBack();
    }, 2500);
  };

  const readOnly = status === 'IN_REVIEW' || status === 'APPROVED' || role !== 'TEACHER';

  return (
    <div className="flex flex-col relative animate-fade-in pb-20 max-w-4xl mx-auto">
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl z-50 font-bold flex items-center gap-3 text-lg">
          {toastMessage}
        </div>
      )}

      <div className="flex items-center justify-between mb-10">
        <button onClick={onBack} className="text-text-muted hover:text-gray-800 font-bold px-4 py-2 rounded-full hover:bg-gray-200 transition">← Volver al listado</button>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-teal-700 bg-teal-50 px-4 py-2 rounded-full border border-teal-200">{modality === 'DIRECT' ? 'Prestación Directa' : 'Prestación Indirecta'}</span>
          {(status === 'APPROVED' || role === 'SUPERVISOR') && (
            <button onClick={onViewOfficial} className="text-sm font-bold bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-full shadow-sm transition flex items-center gap-2">
              Versión Oficial IMSS
            </button>
          )}
        </div>
      </div>

      <h3 className="text-4xl font-bold text-text-primary mb-8 text-center">Planeación Semanal</h3>
      {role === 'SUPERVISOR' && <p className="text-center text-text-muted font-bold mb-8 uppercase tracking-widest text-sm">Vista de solo lectura (Supervisión)</p>}

      <div className="space-y-8 pb-8">
        {days.length > 0 && (
          <>
            <WeekDayTabs days={days} activeIndex={activeDayIndex} onSelect={setActiveDayIndex} />

            {(() => {
              const d = days[activeDayIndex];
              if (!d) return null;
              const isMonday = d.dayOfWeek === 'MONDAY';
              const hasActivities = d.activities && d.activities.length > 0;

              if (!isMonday && !hasActivities) {
                return (
                  <div key={d.dayOfWeek} className="w-full bg-surface-soft rounded-xl border border-border-soft p-12 text-center text-text-muted font-medium animate-fade-in">
                    <p className="text-xl">Día pendiente de planeación.</p>
                    <p className="text-sm mt-2">(Marcador de posición para pruebas de progreso diario)</p>
                  </div>
                );
              }

              return (
                <div key={d.dayOfWeek} className="w-full bg-white rounded-xl shadow-sm border border-border-soft p-8 md:p-12 animate-fade-in-up">
                  <h4 className="text-3xl font-bold text-teal-900 mb-2 uppercase tracking-widest text-center">
                    {d.dayOfWeek === 'MONDAY' ? 'Lunes' : d.dayOfWeek === 'TUESDAY' ? 'Martes' : d.dayOfWeek === 'WEDNESDAY' ? 'Miércoles' : d.dayOfWeek === 'THURSDAY' ? 'Jueves' : 'Viernes'}
                  </h4>

                  {!hasActivities && isMonday && !mondayProposal && !isGenerating && (
                    <div className="mt-8 space-y-6">
                      <div className="bg-surface-ivory p-6 rounded-xl border border-teal-100 shadow-sm">
                        <h4 className="text-xl font-bold text-teal-900 mb-4 border-b border-teal-50 pb-2">Contexto Pedagógico de tu Grupo</h4>

                        <div className="space-y-5">
                          <div>
                            <label className="block text-sm font-bold mb-2 text-brand-dark uppercase tracking-wider">1. ¿Qué observaste en el grupo?</label>
                            <textarea disabled={readOnly} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ej: Los niños muestran interés en los sonidos..." className="w-full text-base p-3 bg-white border border-border-default rounded-lg outline-none min-h-[80px] focus:border-brand-primary transition resize-y" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold mb-2 text-brand-dark uppercase tracking-wider">2. ¿Qué necesitan fortalecer?</label>
                            <textarea disabled={readOnly} value={needs} onChange={e => setNeeds(e.target.value)} placeholder="Ej: Control postural, atención conjunta..." className="w-full text-base p-3 bg-white border border-border-default rounded-lg outline-none min-h-[80px] focus:border-brand-primary transition resize-y" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold mb-2 text-brand-dark uppercase tracking-wider">3. ¿Hay situaciones a considerar?</label>
                            <textarea disabled={readOnly} value={specialSituations} onChange={e => setSpecialSituations(e.target.value)} placeholder="Ej: Dos niños nuevos en adaptación..." className="w-full text-base p-3 bg-white border border-border-default rounded-lg outline-none min-h-[80px] focus:border-brand-primary transition resize-y" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold mb-2 text-brand-dark uppercase tracking-wider">4. ¿Qué materiales tienes disponibles?</label>
                            <textarea disabled={readOnly} value={availableMaterials} onChange={e => setAvailableMaterials(e.target.value)} placeholder="Ej: Sonajas, colchonetas, pintura dactilar..." className="w-full text-base p-3 bg-white border border-border-default rounded-lg outline-none min-h-[80px] focus:border-brand-primary transition resize-y" />
                          </div>
                        </div>
                      </div>

                      <div className="text-center mt-8">
                        <button onClick={handleRecommendMonday} disabled={!obs || readOnly} className="bg-brand-primary hover:bg-brand-dark focus:ring-4 focus:ring-brand-primary/30 text-white font-bold text-xl px-8 py-4 rounded-full shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-3 w-full max-w-md mx-auto">
                          ✨ Ayúdame con TutorIA
                        </button>
                        <p className="text-xs text-text-muted mt-3 uppercase tracking-wider font-bold">Asistente IA (Mock / Demo)</p>
                      </div>
                    </div>
                  )}

                  {isGenerating && (
                    <div className="mt-12 text-center text-brand-primary font-bold text-xl animate-pulse">
                      Consultando referencias curriculares y adaptando propuesta...
                    </div>
                  )}

                  {mondayProposal && (
                    <div className="mt-8 bg-purple-50 border-2 border-purple-200 rounded-xl p-8 animate-fade-in shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <h5 className="font-bold text-purple-900 text-xl flex items-center gap-2">
                          <span className="text-2xl">✨</span> PROPUESTA DE TUTORIA
                        </h5>
                        <span className="text-xs font-bold bg-purple-200 text-purple-800 px-3 py-1 rounded-full uppercase tracking-wider">Borrador IA</span>
                      </div>
                      <div className="bg-white p-6 rounded-lg mb-6 shadow-sm border border-purple-100">
                        {mondayProposal.activities.map(a => (
                          <div key={a.activityId} className="mb-4 last:mb-0 border-b last:border-b-0 pb-4 last:pb-0 border-purple-50">
                            <p className="font-bold text-purple-900">{a.category}</p>
                            <p className="text-gray-800 text-sm mt-1">{a.objective}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-4 justify-center">
                        <button onClick={handleAcceptProposal} className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-6 py-3 rounded-full transition shadow-sm">
                          Aceptar / Usar propuesta
                        </button>
                        <button onClick={handleDiscardProposal} className="bg-white text-purple-700 border border-purple-300 hover:bg-purple-100 font-bold px-6 py-3 rounded-full transition">
                          Descartar
                        </button>
                      </div>
                    </div>
                  )}

                  {hasActivities && (
                    <div className="space-y-4 mt-8">
                      {d.activities.map((a, j) => {
                         const isExpanded = expandedActivityId === a.activityId;
                         const gObs = granularObservations.find(o => o.targetId === a.activityId);

                         let highlightClass = "border-border-soft bg-surface-soft";
                         if (gObs && gObs.status === 'PENDING_CORRECTION') highlightClass = "border-orange-400 bg-orange-50 ring-2 ring-orange-200";
                         else if (gObs && gObs.status === 'CHANGED_BY_EDUCATOR') highlightClass = "border-yellow-400 bg-yellow-50";
                         else if (gObs && gObs.status === 'RESOLVED') highlightClass = "border-green-300 bg-green-50";

                         return (
                           <div key={a.activityId} className={`rounded-xl border overflow-hidden transition ${highlightClass}`}>
                             {gObs && (gObs.status === 'PENDING_CORRECTION' || gObs.status === 'CHANGED_BY_EDUCATOR') && (
                               <div className="bg-orange-100 border-b border-orange-200 p-4 text-orange-900">
                                 <span className="font-bold text-sm uppercase tracking-wider block mb-1">⚠️ OBSERVACIÓN DE LA DIRECTORA:</span>
                                 <p className="text-sm font-bold text-orange-950">{gObs.observation}</p>
                                 {gObs.status === 'CHANGED_BY_EDUCATOR' && <span className="text-xs font-bold bg-yellow-200 text-yellow-800 px-2 py-1 mt-2 inline-block rounded">✓ Modificado, pendiente de reenviar</span>}
                               </div>
                             )}
                             <button onClick={() => setExpandedActivityId(isExpanded ? null : a.activityId)} className="w-full text-left p-6 hover:bg-white/50 transition flex justify-between items-center group outline-none">
                               <div>
                                 <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">{a.category} • {a.durationMinutes} min</p>
                                 <p className="font-bold text-text-primary text-xl group-hover:text-teal-800 transition">{a.objective}</p>
                               </div>
                               <div className="text-teal-600 font-medium px-4 py-2 rounded-full bg-white border border-teal-100 shadow-sm flex-shrink-0 transition">
                                 {isExpanded ? 'Ocultar' : 'Revisar / Editar'}
                               </div>
                             </button>
                             {isExpanded && (
                               <div className="px-6 pb-6 pt-2 border-t border-teal-50 bg-white">
                                 <textarea disabled={readOnly} value={a.description} onChange={e => {
                                    const newDays = [...days];
                                    newDays[activeDayIndex]!.activities![j]!.description = e.target.value;
                                    setDays(newDays);
                                 }} className="w-full text-base p-4 bg-white border border-border-default focus:border-brand-primary rounded-lg outline-none min-h-[160px] resize-y transition" />
                               </div>
                             )}
                           </div>
                         );
                      })}

                      {!readOnly && (
                        <div className="mt-8 text-center flex gap-4 justify-center">
                          <button onClick={handleSaveDraft} className="bg-surface-ivory hover:bg-teal-50 border border-teal-200 text-teal-700 font-bold px-8 py-4 rounded-full transition shadow-sm">
                            Guardar Lunes
                          </button>
                          <button onClick={handleSubmit} disabled={days.filter(day => day.activities.length > 0).length < 1} className="bg-brand-primary hover:bg-brand-dark text-white font-bold px-8 py-4 rounded-full transition shadow-sm disabled:opacity-50">
                            Enviar a Revisión
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};
const DirectorList = ({ service, onSelect, refreshKey }: { service: PlanningWorkflowService, onSelect: (id: string) => void, refreshKey: number }) => {
  const [plans, setPlans] = useState<WeeklyPlanning[]>([]);
  useEffect(() => { service.listDirectorReviewQueue('DIRECTOR').then(setPlans); }, [refreshKey, service]);
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-4xl font-bold mb-10 text-center">Acompañamiento pedagógico</h1>
      <p className="text-center text-text-muted text-lg mb-8">Tus docentes han enviado estas propuestas para que las revisen juntas.</p>
      <div className="grid gap-4 w-full">
        {plans.map(p => (
           <button key={p.planningId} onClick={() => onSelect(p.planningId)} className="bg-white border-2 border-border-soft hover:border-brand-primary p-8 rounded-xl shadow-sm text-left transition w-full outline-none">
             <div className="flex justify-between items-center mb-3">
               <span className="font-bold text-text-primary text-2xl">Anita</span>
               <span className="text-sm font-bold px-4 py-1.5 rounded-full bg-status-review/20 text-status-review">Lista para conversar</span>
             </div>
             <p className="text-base text-text-muted font-medium">Lactantes C • Semana del 10 al 14 de agosto</p>
           </button>
        ))}
        {plans.length === 0 && <p className="text-text-muted text-center mt-12 text-xl font-medium">No tenemos propuestas para conversar en este momento.</p>}
      </div>
    </div>
  );
};





const DirectorReview = ({ service, planId, onBack, onSaved, onViewOfficial }: { service: PlanningWorkflowService, planId: string, onBack: () => void, onSaved: () => void, onViewOfficial: () => void }) => {
  const [plan, setPlan] = useState<any>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  // DRAFTING STATE (Review Round)
  const [newGranularObs, setNewGranularObs] = useState<Record<string, string>>({});
  const [preparedObservations, setPreparedObservations] = useState<Record<string, string>>({});

  const [collapsedResolved, setCollapsedResolved] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => { service.getPlanning(planId).then(setPlan); }, [planId, service, toastMessage]);
  if (!plan) return <p className="p-8 text-center text-xl">Leyendo la propuesta...</p>;

  // P0-2: "GUARDAR OBSERVACIÓN" MEANS ONLY SAVE LOCALLY
  const handleSavePrepared = (activityId: string) => {
    const obsText = newGranularObs[activityId];
    if (!obsText || !obsText.trim()) return;

    setPreparedObservations(prev => ({
      ...prev,
      [activityId]: obsText.trim()
    }));
    setNewGranularObs(prev => { const n = {...prev}; delete n[activityId]; return n; });
    setToastMessage('✓ Observación preparada localmente (No enviada)');
    setTimeout(() => { setToastMessage(''); }, 2000);
  };

  // P0-4: ATOMIC "SEND OBSERVATIONS TO EDUCATOR"
  const handleSendRound = async () => {
    const granularObsArray = [];
    for (const [activityId, obsText] of Object.entries(preparedObservations)) {
      // Find original content
      let originalContent = '';
      for (const d of plan.days) {
        const act = d.activities.find((a: any) => a.activityId === activityId);
        if (act) originalContent = act.description;
      }
      granularObsArray.push({
        targetId: activityId,
        observation: obsText,
        originalContent: originalContent,
        currentContent: originalContent,
        status: 'PENDING_CORRECTION',
        reviewer: 'DIRECTOR',
        timestamp: new Date()
      });
    }

    await service.reject(planId, 'Se requieren ajustes en la planeación.', 'DIRECTOR', 'DIRECTOR', granularObsArray);

    setPreparedObservations({});
    setToastMessage('✓ Observaciones enviadas a la educadora.');
    onSaved();
    setTimeout(() => { setToastMessage(''); onBack(); }, 2000);
  };

  const handleResolve = async (activityId: string) => {
    await service.resolveGranularObservation(planId, activityId, 'DIRECTOR', 'Ceci');
    const updatedPlan = await service.getPlanning(planId);
    setPlan(updatedPlan);
    setCollapsedResolved(prev => ({...prev, [activityId]: true}));
    setToastMessage('✅ OBSERVACIÓN ATENDIDA');
    onSaved();
    setTimeout(() => { setToastMessage(''); }, 2000);
  };

  const preparedCount = Object.keys(preparedObservations).length;

  return (
    <div className="max-w-5xl mx-auto pb-32 animate-fade-in relative">
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl z-50 font-bold flex items-center gap-3 text-lg">
          {toastMessage}
        </div>
      )}

      {(() => {
        const existingObsList = plan?.granularObservations || [];
        const pendingCount = existingObsList.filter((o: any) => o.status === 'PENDING_CORRECTION' || o.status === 'CHANGED_BY_EDUCATOR').length;
        const resolvedCount = existingObsList.filter((o: any) => o.status === 'RESOLVED').length;
        if (pendingCount > 0 || resolvedCount > 0) {
          return (
            <div className="flex justify-center gap-6 mb-8 -mt-4">
               {pendingCount > 0 && <span className="px-4 py-2 bg-yellow-100 text-yellow-900 border border-yellow-300 font-bold rounded-full uppercase tracking-wider text-sm shadow-sm">{pendingCount} observaciones pendientes</span>}
               {resolvedCount > 0 && <span className="px-4 py-2 bg-green-100 text-green-900 border border-green-300 font-bold rounded-full uppercase tracking-wider text-sm shadow-sm">{resolvedCount} observación atendida</span>}
            </div>
          );
        }
        return null;
      })()}

      {/* Sticky Prepared Summary */}
      {preparedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-orange-100 border-t-4 border-orange-500 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-40 flex justify-center items-center gap-6">
          <p className="text-orange-900 font-bold text-lg uppercase tracking-wider">{preparedCount} observaciones preparadas</p>
          <button onClick={handleSendRound} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-3 rounded-full shadow-md transition">
            ENVIAR OBSERVACIONES A LA EDUCADORA
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-text-muted hover:text-gray-800 font-bold px-4 py-2 rounded-full hover:bg-gray-200 transition">← Volver al listado</button>
        {plan.status === 'APPROVED' && (
          <button onClick={onViewOfficial} className="text-sm font-bold bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-full shadow-sm transition flex items-center gap-2">
            Versión Oficial IMSS
          </button>
        )}
      </div>

      <div className="text-center mb-12">
        <h2 className="text-5xl font-bold mb-4">Anita</h2>
        <p className="text-text-muted font-bold text-2xl uppercase tracking-widest">Lactantes C</p>
      </div>

      <div className="max-w-4xl mx-auto mb-12">
        <div className="bg-surface-ivory rounded-xl border border-brand-primary/20 p-8 shadow-sm">
          <h3 className="text-xl font-bold text-teal-800 uppercase tracking-widest border-b border-teal-100 pb-2">Contexto de la Educadora</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <p className="text-sm font-bold text-text-muted uppercase mb-1">Observaciones</p>
              <p className="text-text-primary">{plan.observations || 'Sin especificar'}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted uppercase mb-1">Necesidades detectadas</p>
              <p className="text-text-primary">{plan.identifiedNeeds || 'Sin especificar'}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted uppercase mb-1">Situaciones especiales</p>
              <p className="text-text-primary">{plan.specialSituations || 'Sin especificar'}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted uppercase mb-1">Materiales disponibles</p>
              <p className="text-text-primary">{plan.availableMaterials || 'Sin especificar'}</p>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-3xl font-bold mb-8 text-text-primary text-center">Desarrollo de las acciones pedagógicas</h3>

      <div className="space-y-8 pb-8 max-w-4xl mx-auto">
        <WeekDayTabs days={plan.days} activeIndex={activeDayIndex} onSelect={setActiveDayIndex} />

        {(() => {
          const d = plan.days[activeDayIndex];
          if (!d) return null;
          const dayName = d.dayOfWeek === 'MONDAY' ? 'Lunes' : d.dayOfWeek === 'TUESDAY' ? 'Martes' : d.dayOfWeek === 'WEDNESDAY' ? 'Miércoles' : d.dayOfWeek === 'THURSDAY' ? 'Jueves' : 'Viernes';

          if (!d.activities || d.activities.length === 0) {
            return (
              <div key={d.dayOfWeek} className="w-full bg-surface-soft rounded-xl border border-border-soft p-12 text-center text-text-muted font-medium">
                <p className="text-xl">Día pendiente de planeación.</p>
              </div>
            );
          }

          return (
            <div key={d.dayOfWeek} className="w-full bg-white rounded-xl shadow-sm border border-border-soft p-8 md:p-12 animate-fade-in-up">
               <h4 className="text-3xl font-bold text-teal-900 mb-6 uppercase tracking-widest text-center">{dayName}</h4>
               <div className="space-y-4">
                 {d.activities.map((a: any) => {
                    const isExpanded = expandedActivityId === a.activityId;

                    // We must find the LATEST observation if there are multiple.
                    // For H1R3, finding the first (or last) is enough, assume findLast if JS supported it easily, we'll reverse.
                    const existingObs = [...plan.granularObservations].reverse().find((o: any) => o.targetId === a.activityId);

                    const isPrepared = !!preparedObservations[a.activityId];

                    let highlightClass = "bg-surface-soft border-border-soft";
                    let badge = null;
                    if (isPrepared) {
                       highlightClass = "bg-orange-50 border-orange-400 ring-2 ring-orange-200";
                       badge = <span className="bg-orange-200 text-orange-900 px-3 py-1 text-xs font-bold uppercase rounded-full tracking-widest">Observación preparada</span>;
                    } else if (existingObs) {
                      if (existingObs.status === 'CHANGED_BY_EDUCATOR') {
                         highlightClass = "bg-yellow-50 border-yellow-400 ring-2 ring-yellow-200";
                         badge = <span className="bg-yellow-200 text-yellow-900 px-3 py-1 text-xs font-bold uppercase rounded-full tracking-widest">CAMBIO SOLICITADO ANTERIORMENTE</span>;
                      } else if (existingObs.status === 'PENDING_CORRECTION') {
                         highlightClass = "bg-orange-50 border-orange-300";
                         badge = <span className="bg-orange-200 text-orange-900 px-3 py-1 text-xs font-bold uppercase rounded-full tracking-widest">Pendiente de corregir por educadora</span>;
                      } else if (existingObs.status === 'RESOLVED') {
                         highlightClass = "bg-green-50 border-green-300";
                         badge = <span className="bg-green-200 text-green-900 px-3 py-1 text-xs font-bold uppercase rounded-full tracking-widest">Observación atendida</span>;
                      }
                    }

                    if (existingObs && existingObs.status === 'RESOLVED' && collapsedResolved[a.activityId] && !isExpanded) {
                      return (
                        <div key={a.activityId} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-green-50 p-5 rounded-xl border border-green-200 mt-4 mb-4 shadow-sm transition">
                          <div>
                             <p className="font-bold text-green-900 text-lg">{a.objective}</p>
                             <span className="bg-green-200 text-green-900 px-3 py-1 text-xs font-bold uppercase rounded-full mt-2 inline-block tracking-widest shadow-sm">Observación atendida</span>
                          </div>
                          <button onClick={() => { setCollapsedResolved(prev => ({...prev, [a.activityId]: false})); setExpandedActivityId(a.activityId); }} className="text-green-700 hover:text-green-900 font-bold text-sm uppercase tracking-wider underline mt-3 sm:mt-0 px-4 py-2">
                            Ver detalle
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div key={a.activityId} className={`rounded-xl border overflow-hidden transition ${highlightClass}`}>
                        <button onClick={() => setExpandedActivityId(isExpanded ? null : a.activityId)} className="w-full text-left p-6 hover:bg-white/50 transition flex justify-between items-center outline-none">
                          <div>
                            {badge && <div className="mb-3">{badge}</div>}
                            <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">{a.category} • {a.durationMinutes} min</p>
                            <p className="font-bold text-text-primary text-xl">{a.objective}</p>
                          </div>
                          <div className="text-teal-600 font-medium px-4 py-2 rounded-full bg-white border border-teal-100 shadow-sm flex-shrink-0">
                            {isExpanded ? 'Ocultar' : 'Revisar'}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-6 pb-6 pt-2 border-t border-teal-50 bg-white animate-fade-in">
                            <p className="font-bold text-text-primary text-lg mb-2">{a.objective}</p>
                            <p className="text-base text-gray-800 leading-relaxed mb-4">{a.description}</p>
                            <p className="text-sm font-bold text-text-muted uppercase mb-6">Materiales: <span className="text-gray-800 normal-case font-medium">{a.materials.join(', ')}</span></p>

                            {/* PREPARED STATE */}
                            {isPrepared && (
                              <div className="bg-orange-50 p-5 rounded-xl border border-orange-400 mt-4 mb-6 shadow-sm">
                                <h5 className="font-bold text-orange-900 text-sm uppercase tracking-wider mb-3">Observación preparada (Borrador):</h5>
                                <p className="text-orange-900 font-bold">{preparedObservations[a.activityId]}</p>
                                <button onClick={() => {
                                  const n = {...preparedObservations};
                                  delete n[a.activityId];
                                  setPreparedObservations(n);
                                }} className="text-orange-700 text-sm font-bold uppercase tracking-wider mt-4 underline">
                                  Eliminar observación
                                </button>
                              </div>
                            )}

                            {/* RE-REVIEW STATE (P0-8) */}
                            {existingObs && (existingObs.status === 'CHANGED_BY_EDUCATOR' || existingObs.status === 'PENDING_CORRECTION' || existingObs.status === 'RESOLVED') && !isPrepared && (
                              <div className={`p-5 rounded-xl border mt-4 mb-6 ${existingObs.status === 'RESOLVED' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-300 shadow-sm'}`}>
                                <h5 className={`font-bold text-sm uppercase tracking-wider mb-3 ${existingObs.status === 'RESOLVED' ? 'text-green-900' : 'text-yellow-900'}`}>MI OBSERVACIÓN PREVIA:</h5>
                                <p className={`mb-4 font-bold text-lg ${existingObs.status === 'RESOLVED' ? 'text-green-900' : 'text-yellow-900'}`}>{existingObs.observation}</p>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-white p-4 rounded border border-gray-200">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Antes:</p>
                                    <p className="text-sm text-gray-700 font-normal leading-relaxed">{existingObs.originalContent}</p>
                                  </div>
                                  <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
                                    <p className="text-xs font-bold text-green-700 uppercase mb-2">AHORA:</p>
                                    <p className="text-base text-gray-900 font-bold leading-relaxed">{existingObs.currentContent}</p>
                                  </div>
                                </div>
                                {existingObs.status === 'CHANGED_BY_EDUCATOR' && (
                                  <div className="mt-4 flex flex-col gap-3">
                                    <button onClick={() => handleResolve(a.activityId)} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-3 rounded uppercase tracking-wider text-sm transition text-center shadow-sm">
                                      MARCAR COMO ATENDIDA
                                    </button>

                                    {/* P0-10: NEW ADJUSTMENT AFTER CORRECTION */}
                                    <div className="bg-orange-50 p-4 rounded mt-4 border border-orange-200">
                                      <label className="block text-sm font-bold text-orange-900 uppercase tracking-wider mb-2">
                                        NUEVA OBSERVACIÓN
                                      </label>
                                      <textarea
                                        value={newGranularObs[a.activityId] || ''}
                                        onChange={e => setNewGranularObs({ ...newGranularObs, [a.activityId]: e.target.value })}
                                        className="w-full text-base p-3 bg-white border border-orange-300 focus:border-orange-500 rounded outline-none transition min-h-[60px] resize-y mb-2"
                                        placeholder="Escribe un nuevo ajuste si es necesario..."
                                      />
                                      <button disabled={!newGranularObs[a.activityId]} onClick={() => handleSavePrepared(a.activityId)} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded text-sm transition disabled:opacity-50">
                                        SOLICITAR NUEVO AJUSTE (Guardar observación)
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* FIRST REVIEW STATE */}
                            {plan.status !== 'APPROVED' && !isPrepared && (!existingObs || existingObs.status === 'RESOLVED') && (
                              <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 mt-4">
                                <label className="block text-sm font-bold text-orange-900 uppercase tracking-wider mb-3">
                                  Agregar observación a esta actividad
                                </label>
                                <textarea
                                  value={newGranularObs[a.activityId] || ''}
                                  onChange={e => setNewGranularObs({ ...newGranularObs, [a.activityId]: e.target.value })}
                                  className="w-full text-base p-4 bg-white border border-orange-300 focus:border-orange-500 rounded-lg outline-none transition min-h-[80px] resize-y mb-3"
                                  placeholder="¿Qué sugerencia tienes sobre esta actividad?"
                                />
                                <button disabled={!newGranularObs[a.activityId]} onClick={() => handleSavePrepared(a.activityId)} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded text-sm transition disabled:opacity-50">
                                  Guardar observación
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                 })}
               </div>
            </div>
          );
        })()}
      </div>

      {plan.status === 'IN_REVIEW' && (
        <div className="mt-16 flex justify-center">
          <div className="flex flex-col gap-6 max-w-2xl w-full">
            <button
              onClick={handleSendRound}
              disabled={preparedCount === 0}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg px-8 py-4 rounded-full shadow-sm transition disabled:opacity-50 uppercase tracking-wider"
            >
              ENVIAR OBSERVACIONES A LA EDUCADORA
            </button>

            {(() => {
              const existingObsList = plan?.granularObservations || [];
              const pendingCount = existingObsList.filter((o: any) => o.status === 'PENDING_CORRECTION' || o.status === 'CHANGED_BY_EDUCATOR').length;
              const canApprove = preparedCount === 0 && pendingCount === 0;

              return (
                <>
                  <button
                    onClick={async () => {
                      await service.approve(planId, 'DIRECTOR', 'Ceci');
                      onSaved();
                      setToastMessage('🌟 Propuesta aprobada.');
                      setTimeout(() => { setToastMessage(''); onBack(); }, 2000);
                    }}
                    disabled={!canApprove}
                    className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold text-lg px-8 py-6 rounded-full shadow-lg transition flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    ✓ APROBAR TODA LA PLANEACIÓN
                  </button>
                  {preparedCount > 0 && <p className="text-center text-orange-700 text-sm font-bold">La aprobación está bloqueada porque hay observaciones preparadas sin enviar.</p>}
                  {pendingCount > 0 && preparedCount === 0 && <p className="text-center text-orange-700 text-sm font-bold">La aprobación está bloqueada porque hay observaciones pendientes de revisar o atender.</p>}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

const SupervisorReview = ({ service, planId, modality, onBack, onViewOfficial }: { service: PlanningWorkflowService, planId: string, modality: 'DIRECT'|'INDIRECT', onBack: () => void, onViewOfficial: () => void }) => {
  const [plan, setPlan] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'PLAN' | 'HISTORY'>('PLAN');

  useEffect(() => { service.getPlanning(planId).then(setPlan); }, [planId, service]);
  if (!plan) return <p className="p-8 text-center text-xl">Cargando...</p>;

  return (
    <div className="max-w-5xl mx-auto pb-32 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
        <button onClick={onBack} className="text-text-muted hover:text-gray-800 font-bold px-4 py-2 rounded-full hover:bg-gray-200 transition">← Volver al listado</button>
        <div className="flex gap-3">
          <button onClick={() => setActiveTab('PLAN')} className={`px-6 py-2 rounded-full font-bold transition ${activeTab === 'PLAN' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>VER PLANEACIÓN</button>
          <button onClick={() => setActiveTab('HISTORY')} className={`px-6 py-2 rounded-full font-bold transition ${activeTab === 'HISTORY' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>VER HISTORIAL DE CAMBIOS</button>
          <button onClick={onViewOfficial} className="px-6 py-2 rounded-full font-bold transition bg-teal-700 hover:bg-teal-800 text-white shadow-sm flex items-center gap-2">VER VERSIÓN OFICIAL IMSS</button>
        </div>
      </div>

      {activeTab === 'PLAN' && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-border-soft">
          <h2 className="text-3xl font-bold mb-6 text-center text-text-primary">Contenido de la Planeación (Lectura)</h2>
          <div className="bg-surface-soft border border-border-soft p-6 rounded-xl mb-8 space-y-4">
            <h3 className="text-xl font-bold text-teal-800 uppercase tracking-widest border-b border-teal-100 pb-2">Contexto de la Educadora</h3>
            <div><p className="text-sm font-bold text-text-muted uppercase mb-1">Observaciones</p><p className="text-text-primary">{plan.observations || 'Sin especificar'}</p></div>
            <div><p className="text-sm font-bold text-text-muted uppercase mb-1">Necesidades Identificadas</p><p className="text-text-primary">{plan.identifiedNeeds || 'Sin especificar'}</p></div>
            <div><p className="text-sm font-bold text-text-muted uppercase mb-1">Situaciones Especiales</p><p className="text-text-primary">{plan.specialSituations || 'Sin especificar'}</p></div>
            <div><p className="text-sm font-bold text-text-muted uppercase mb-1">Materiales Disponibles</p><p className="text-text-primary">{plan.availableMaterials || 'Sin especificar'}</p></div>
          </div>
          {plan.days.map((d: any) => (
            <div key={d.dayOfWeek} className="mb-8">
              <h3 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4">{d.dayOfWeek}</h3>
              {d.activities.length === 0 ? <p className="text-gray-500">Sin actividades</p> : d.activities.map((a: any) => (
                <div key={a.activityId} className="mb-4">
                  <p className="font-bold text-lg text-gray-900 mb-1">{a.objective} ({a.durationMinutes} min)</p>
                  <p className="text-gray-700 font-normal">{a.description}</p>
                  <p className="text-sm mt-1 font-normal"><strong>Materiales:</strong> {a.materials.join(', ')}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-border-soft">
          <h2 className="text-3xl font-bold mb-6 text-center text-text-primary">HISTORIAL DE REVISIONES</h2>
          {!plan.granularObservations || plan.granularObservations.length === 0 ? (
            <p className="text-center text-gray-500 font-medium">No hay observaciones registradas.</p>
          ) : (
            <div className="space-y-12">
              {plan.historicalRounds && plan.historicalRounds.length > 0 ? (
                <>
                  <div className="space-y-6">
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-2">▼ ÚLTIMA REVISIÓN — RONDA {plan.historicalRounds.length}</h3>
                    {[...plan.historicalRounds[plan.historicalRounds.length - 1].observations].reverse().map((obs: any, idx: number) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-bold text-gray-800 uppercase tracking-wider text-sm">Observación Directora</span>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${obs.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : obs.status === 'CHANGED_BY_EDUCATOR' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'}`}>
                              {obs.status === 'RESOLVED' ? '✅ ATENDIDA' : 'Pendiente / Cambio solicitado'}
                            </span>
                            {obs.status === 'RESOLVED' && obs.resolvedBy && (
                              <span className="text-xs text-green-700 font-bold">Atendida por: {obs.resolvedBy} - {new Date(obs.resolvedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-lg font-black text-gray-900 mb-4">{obs.observation}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-4 rounded border border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Antes (Original):</p>
                            <p className="text-sm text-gray-700 font-normal">{obs.originalContent}</p>
                          </div>
                          <div className="bg-white border border-gray-200 p-4 rounded shadow-sm">
                            <p className="text-xs font-bold text-green-700 uppercase mb-2">Ahora (Educadora):</p>
                            <p className="text-sm text-gray-900 font-bold">{obs.currentContent}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {plan.historicalRounds.length > 1 && (
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-gray-600 uppercase tracking-widest border-b border-gray-200 pb-2 mt-8">REVISIONES ANTERIORES</h3>
                      {[...plan.historicalRounds].reverse().slice(1).map((round: any, rIdx: number) => (
                        <details key={round.roundId} className="group">
                          <summary className="font-bold text-gray-600 cursor-pointer mb-4 outline-none hover:text-gray-800 uppercase tracking-wider text-sm bg-gray-50 p-3 rounded border border-gray-200 text-left flex items-center">
                            ▶ REVISIÓN ANTERIOR — RONDA {plan.historicalRounds.length - 1 - rIdx}
                          </summary>
                          <div className="space-y-6 mt-4">
                            {[...round.observations].reverse().map((obs: any, idx: number) => (
                              <div key={idx} className="border border-gray-200 rounded-lg p-5 opacity-80 hover:opacity-100 transition bg-white">
                                <div className="flex justify-between items-center mb-4">
                                  <span className="font-bold text-gray-600 uppercase tracking-wider text-sm">Observación Directora</span>
                                </div>
                                <p className="text-base font-black text-gray-700 mb-4">{obs.observation}</p>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Antes:</p>
                                    <p className="text-xs text-gray-600 font-normal">{obs.originalContent}</p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                    <p className="text-xs font-bold text-gray-700 uppercase mb-1">Después:</p>
                                    <p className="text-xs text-gray-800 font-bold">{obs.currentContent}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-2">▼ ÚLTIMA REVISIÓN</h3>
                  {[...plan.granularObservations].reverse().map((obs: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-gray-800 uppercase tracking-wider text-sm">Observación Directora</span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${obs.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : obs.status === 'CHANGED_BY_EDUCATOR' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'}`}>
                          {obs.status === 'RESOLVED' ? 'Atendida' : 'Pendiente / Cambio solicitado'}
                        </span>
                      </div>
                      <p className="text-lg font-black text-gray-900 mb-4">{obs.observation}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded border border-gray-100">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Antes (Original):</p>
                          <p className="text-sm text-gray-700 font-normal">{obs.originalContent}</p>
                        </div>
                        <div className="bg-white border border-gray-200 p-4 rounded shadow-sm">
                          <p className="text-xs font-bold text-green-700 uppercase mb-2">Ahora (Educadora):</p>
                          <p className="text-sm text-gray-900 font-bold">{obs.currentContent}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
const SupervisorList = ({ service, onSelect, refreshKey }: { service: PlanningWorkflowService, onSelect: (id: string) => void, refreshKey: number }) => {
  const [plans, setPlans] = useState<WeeklyPlanning[]>([]);
  useEffect(() => { service.listSupervisorApprovedPlanning('SUPERVISOR').then(setPlans); }, [refreshKey, service]);
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-4xl font-bold mb-4 text-center">Planeaciones aprobadas</h1>
      <p className="text-center text-text-muted text-xl mb-12">Conoce el trabajo de tus educadoras.</p>

      <div className="grid gap-6 w-full">
        {plans.map(p => (
           <button key={p.planningId} onClick={() => onSelect(p.planningId)} className="bg-white border border-border-default hover:border-gray-400 p-8 rounded-xl shadow-sm text-left transition w-full outline-none flex justify-between items-center">
             <div>
               <span className="font-bold text-text-primary text-2xl mb-2 block">Anita</span>
               <p className="text-lg text-text-muted font-medium">Lactantes C • Semana del 10 al 14 de agosto</p>
             </div>
               <span className="text-sm font-bold px-6 py-2 rounded-full bg-status-approved/20 text-status-approved border border-green-200">Planeación aprobada</span>
           </button>
        ))}
        {plans.length === 0 && <p className="text-text-muted text-center mt-12 text-xl font-medium">Aún no hay planeaciones aprobadas para esta semana.</p>}
      </div>
    </div>
  );
};




const PrintableView = ({ service, planId, modality, onBack }: { service: PlanningWorkflowService, planId: string, modality: 'DIRECT'|'INDIRECT', onBack: () => void }) => {
  const [plan, setPlan] = useState<any>(null);
  useEffect(() => { service.getPlanning(planId).then(setPlan); }, [planId, service]);
  if (!plan) return null;

  const isDirect = modality === 'DIRECT';

  if (isDirect) {
    return (
      <div className="bg-white font-serif w-full text-black">
        <div className="print:hidden mb-8 flex justify-between items-center p-6 bg-surface-soft border border-border-default rounded-xl max-w-5xl mx-auto">
          <button onClick={onBack} className="text-text-muted hover:text-text-primary font-bold px-6 py-3 rounded-full hover:bg-gray-200 transition text-lg">← Volver</button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold bg-teal-50 text-teal-800 px-3 py-1 rounded-full uppercase tracking-widest border border-teal-200">Vista previa institucional</span>
            <button onClick={() => {
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                  printWindow.document.write('<html><head><title>Imprimir Planeación</title>');
                  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join('');
                  printWindow.document.write(styles);
                  printWindow.document.write('</head><body class="bg-white">');
                  const root = document.getElementById('printable-document-root');
                  printWindow.document.write(root ? root.outerHTML : '');
                  printWindow.document.write('</body></html>');
                  printWindow.document.close();
                  printWindow.focus();

                  // Wait for styles/fonts to apply, then print
                  setTimeout(() => {
                      printWindow.print();
                  }, 1000);

                  // Only close the window AFTER the native print dialog is closed
                  printWindow.onafterprint = () => {
                      printWindow.close();
                  };
              }
            }} className="bg-gray-900 hover:bg-black text-white font-bold px-10 py-4 rounded-full shadow-sm text-lg transition">Imprimir PDF</button>
          </div>
        </div>

        <div id="printable-document-root" className="bg-white max-w-5xl mx-auto print:max-w-none p-16 print:p-0 border border-border-default print:border-none print:shadow-none shadow-sm rounded-lg print:rounded-none">
          <div className="border-b-4 border-black pb-8 mb-12 flex justify-between items-end print:pb-2 print:mb-3">
            <div>
              <h1 className="text-4xl print:text-xl font-bold text-black mb-1 tracking-tight">Planeación de Actividades Pedagógicas</h1>
              <p className="text-lg print:text-sm text-gray-700 uppercase tracking-widest font-bold">Código: 3D11-009-003</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-6 py-2 border-4 border-black text-black font-bold uppercase tracking-widest text-lg print:text-xs print:px-2 print:py-1 print:border-2 rounded-lg">{plan.status === 'APPROVED' ? 'Aprobada' : 'Borrador'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-12 text-lg print:text-sm print:mb-8">
            <div><span className="text-gray-600 font-bold block text-sm print:text-[10px] uppercase tracking-wider print:mb-0">Guardería No.</span><p className="font-bold text-black">Guardería IMSS Demo (001)</p></div>
            <div><span className="text-gray-600 font-bold block text-sm print:text-[10px] uppercase tracking-wider print:mb-0">Sala de atención o Grupo</span><p className="font-bold text-black">Lactantes C</p></div>
            <div><span className="text-gray-600 font-bold block text-sm print:text-[10px] uppercase tracking-wider print:mb-0">Periodo</span><p className="font-bold text-black">10 al 14 de agosto de 2026</p></div>
          </div>

          <div className="mb-12 print:mb-3">
            <h3 className="text-xl print:text-[11px] font-bold bg-gray-200 text-black p-1 uppercase border-b-2 border-black print:mb-1 mb-4">Programa Sintético de la Fase 1 para educación inicial</h3>
            <p className="text-base print:text-sm text-black italic">Campos Formativos: Lenguajes, Saberes y Pensamiento Científico, Ética, Naturaleza y Sociedades, De lo Humano y lo Comunitario</p>
          </div>

          <div className="mb-12 print:mb-3">
             <h3 className="text-xl print:text-[11px] font-bold bg-gray-200 text-black p-1 uppercase border-b-2 border-black print:mb-1 mb-4">Observaciones de las y los niños</h3>
             <p className="text-lg print:text-[11px] text-black print:leading-snug">{plan.observations || 'N/A'}</p>
          </div>

          <div className="mb-12 print:mb-3">
             <h3 className="text-xl print:text-[11px] font-bold bg-gray-200 text-black p-1 uppercase border-b-2 border-black print:mb-1 mb-4">Planteamiento de actividades a realizar durante su estancia</h3>
             <div className="space-y-12 print:space-y-6">
               {plan.days.map((d: any) => (
                 <div key={d.dayOfWeek} className="print:break-inside-avoid">
                    <h4 className="text-2xl print:text-[11px] font-bold border-b border-black pb-2 mb-4 print:pb-0 print:mb-1 uppercase text-black">
                      {d.dayOfWeek === 'MONDAY' ? 'Lunes' : d.dayOfWeek === 'TUESDAY' ? 'Martes' : d.dayOfWeek === 'WEDNESDAY' ? 'Miércoles' : d.dayOfWeek === 'THURSDAY' ? 'Jueves' : 'Viernes'}
                    </h4>
                    {(!d.activities || d.activities.length === 0) ? (
                      <p className="text-black italic print:text-[10px]">Pendiente de planeación.</p>
                    ) : (
                      <div className="space-y-6 print:space-y-1">
                        {d.activities.map((a: any) => (
                          <div key={a.activityId} className="print:break-inside-avoid">
                            <p className="font-bold text-lg print:text-[10px] mb-1 print:mb-0">{a.objective} <span className="font-bold">({a.durationMinutes} min)</span></p>
                            <p className="text-black mb-2 print:text-[10px] font-normal print:mb-0 print:leading-tight">{a.description}</p>
                            <p className="text-sm print:text-xs font-normal"><strong>Materiales requeridos para las Actividades Pedagógicas:</strong> {a.materials.join(', ')}</p>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
               ))}
             </div>
          </div>

          <div className="mb-12 print:mb-3">
             <h3 className="text-xl print:text-sm font-bold bg-gray-200 text-black p-2 uppercase border-b-2 border-black mb-4">Evaluación</h3>
             <p className="text-black italic print:text-sm">Espacio para la evaluación posterior a la implementación.</p>
          </div>

          <div className="mb-12 print:mb-3">
             <h3 className="text-xl print:text-sm font-bold bg-gray-200 text-black p-2 uppercase border-b-2 border-black mb-4">Actividades complementarias de otros programas</h3>
             <p className="text-black italic print:text-sm">Pendiente</p>
          </div>

          <div className="mb-12 print:mb-3">
             <h3 className="text-xl print:text-sm font-bold bg-gray-200 text-black p-2 uppercase border-b-2 border-black mb-4">Práctica(s) Priorizada(s) a implementar</h3>
             <p className="text-black italic print:text-sm">Pendiente</p>
          </div>
        </div>
      </div>
    );
  }

  // INDIRECT VIEW
  return (
    <div className="bg-white font-serif w-full text-black">
      <div className="print:hidden mb-8 flex justify-between items-center p-6 bg-surface-soft border border-border-default rounded-xl max-w-5xl mx-auto">
        <button onClick={onBack} className="text-text-muted hover:text-text-primary font-bold px-6 py-3 rounded-full hover:bg-gray-200 transition text-lg">← Volver</button>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold bg-teal-50 text-teal-800 px-3 py-1 rounded-full uppercase tracking-widest border border-teal-200">Vista previa institucional</span>
          <button onClick={() => {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Imprimir Planeación</title>');
                const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join('');
                printWindow.document.write(styles);
                printWindow.document.write('</head><body class="bg-white">');
                const root = document.getElementById('printable-document-root');
                printWindow.document.write(root ? root.outerHTML : '');
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => { printWindow.print(); }, 1000); printWindow.onafterprint = () => { printWindow.close(); };
            }
          }} className="bg-gray-900 hover:bg-black text-white font-bold px-10 py-4 rounded-full shadow-sm text-lg transition">Imprimir PDF</button>
        </div>
      </div>

      <div id="printable-document-root" className="bg-white max-w-5xl mx-auto print:max-w-none p-16 print:p-0 border border-border-default print:border-none print:shadow-none shadow-sm rounded-lg print:rounded-none">
        {/* --- ANVERSO --- */}
        <div className="print:break-after-page mb-16 print:mb-0">
          <div className="border-b-4 border-black pb-8 mb-12 flex justify-between items-end print:pb-4 print:mb-8">
            <div>
              <h1 className="text-4xl print:text-2xl font-bold text-black mb-2 tracking-tight">Planeación de Acciones Pedagógicas<br/><span className="text-2xl print:text-sm">(Anverso)</span></h1>
            </div>
            <div className="text-right">
              <span className="inline-block px-6 py-2 border-4 border-black text-black font-bold uppercase tracking-widest text-lg print:text-sm print:border-2 rounded-lg">{plan.status === 'APPROVED' ? 'Aprobada' : 'Borrador'}</span>
            </div>
          </div>

          <div className="mb-12 print:mb-3">
             <h3 className="text-xl print:text-[11px] font-bold bg-gray-200 text-black p-1 border-b-2 border-black mb-1">Referentes curriculares: Aprendizajes clave para niños de 0 a 3 años de edad</h3>
             <ul className="list-disc pl-6 text-base print:text-[10px] text-black print:leading-snug print:space-y-0">
               <li>Establecer vínculos afectivos y apegos seguros</li>
               <li>Construir una base de seguridad y confianza en sí mismo y en los otros, que favorezca el desarrollo de un psiquismo sano</li>
               <li>Desarrollar autonomía y autorregulación crecientes</li>
               <li>Desarrollar la curiosidad, la exploración, la imaginación y la creatividad</li>
               <li>Acceder al lenguaje en un sentido pleno, comunicacional y creador</li>
               <li>Descubrir en los libros y la lectura el gozo y la riqueza de la ficción</li>
               <li>Descubrir el propio cuerpo desde la libertad de movimiento y la expresividad motriz</li>
               <li>Convivir con otros y compartir el aprendizaje, el juego, el arte y la cultura</li>
             </ul>
          </div>

          <div className="grid grid-cols-3 gap-y-6 gap-x-12 mb-12 text-lg print:text-xs print:mb-3 print:gap-y-2">
            <div><span className="text-gray-600 font-bold block text-sm print:text-[10px] uppercase tracking-wider print:mb-0">Guardería No.</span><p className="font-bold text-black">Guardería IMSS Demo (001)</p></div>
            <div><span className="text-gray-600 font-bold block text-sm print:text-[10px] uppercase tracking-wider print:mb-0">Sala de atención o Grupo</span><p className="font-bold text-black">Lactantes C</p></div>
            <div><span className="text-gray-600 font-bold block text-sm print:text-[10px] uppercase tracking-wider print:mb-0">Periodo</span><p className="font-bold text-black">10 al 14 de agosto de 2026</p></div>
          </div>

          <div className="mb-12 print:mb-3">
             <h3 className="text-xl print:text-sm font-bold bg-gray-200 text-black p-2 uppercase border-b-2 border-black mb-4">Observaciones de los niños</h3>
             <p className="text-lg print:text-sm text-black">{plan.observations || 'N/A'}</p>
          </div>

          <div className="mb-12 print:mb-3">
             <h3 className="text-xl print:text-sm font-bold bg-gray-200 text-black p-2 uppercase border-b-2 border-black mb-4">Planteamiento de acciones pedagógicas (propuesta, organización y desarrollo)</h3>
             <div className="space-y-12 print:space-y-1 border p-4 print:p-1 min-h-[300px] print:min-h-0">
               {plan.days.map((d: any) => (
                 <div key={d.dayOfWeek} className="print:break-inside-avoid">
                    <h4 className="text-2xl print:text-[11px] font-bold border-b border-black pb-2 mb-4 print:pb-0 print:mb-1 uppercase text-black">
                      {d.dayOfWeek === 'MONDAY' ? 'Lunes' : d.dayOfWeek === 'TUESDAY' ? 'Martes' : d.dayOfWeek === 'WEDNESDAY' ? 'Miércoles' : d.dayOfWeek === 'THURSDAY' ? 'Jueves' : 'Viernes'}
                    </h4>
                    {(!d.activities || d.activities.length === 0) ? (
                      <p className="text-black italic print:text-sm">Pendiente de planeación.</p>
                    ) : (
                      <div className="space-y-6 print:space-y-4">
                        {d.activities.map((a: any) => (
                          <div key={a.activityId} className="print:break-inside-avoid">
                            <p className="font-bold text-lg print:text-[10px] mb-1 print:mb-0">{a.objective} <span className="font-bold">({a.durationMinutes} min)</span></p>
                            <p className="text-black mb-2 print:text-[10px] font-normal print:mb-0 print:leading-tight">{a.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
               ))}
             </div>
          </div>

          <div className="mt-8 text-right">
             <p className="text-lg print:text-sm text-gray-700 font-bold">DPES/CG/2020/PDG/04</p>
          </div>
        </div>

        {/* --- REVERSO --- */}
        <div className="print:pt-8">
          <div className="border-b-4 border-black pb-8 mb-12 flex justify-between items-end print:pb-4 print:mb-8">
            <div>
              <h1 className="text-4xl print:text-2xl font-bold text-black mb-2 tracking-tight">Planeación de Acciones Pedagógicas<br/><span className="text-2xl print:text-lg">(Reverso)</span></h1>
            </div>
          </div>

          <div className="mb-12 print:mb-3">
             <h3 className="text-xl print:text-sm font-bold bg-gray-200 text-black p-2 uppercase border-b-2 border-black mb-4">Evaluación:</h3>
             <p className="text-black italic print:text-sm border p-4 min-h-[100px] print:min-h-[60px]">Espacio para la evaluación posterior a la implementación.</p>
          </div>

          <div className="mb-12 print:mb-3">
             <h3 className="text-xl print:text-sm font-bold bg-gray-200 text-black p-2 uppercase border-b-2 border-black mb-4">Actividades complementarias de otros programas</h3>
             <p className="text-black italic print:text-sm border p-4 min-h-[100px] print:min-h-[60px]">Pendiente</p>
          </div>

          <div className="mb-12 print:mb-3">
             <h3 className="text-xl print:text-sm font-bold bg-gray-200 text-black p-2 uppercase border-b-2 border-black mb-4">Materiales para ambientes de aprendizaje</h3>
             <div className="space-y-4 print:space-y-2 border p-4 min-h-[100px] print:min-h-[60px]">
               {plan.days.map((d: any) => d.activities && d.activities.map((a: any) =>
                 a.materials.length > 0 && (
                   <p key={a.activityId} className="text-black print:text-sm">
                     <strong>{d.dayOfWeek === 'MONDAY' ? 'Lunes' : d.dayOfWeek === 'TUESDAY' ? 'Martes' : d.dayOfWeek === 'WEDNESDAY' ? 'Miércoles' : d.dayOfWeek === 'THURSDAY' ? 'Jueves' : 'Viernes'} - {a.objective}:</strong> {a.materials.join(', ')}
                   </p>
                 )
               ))}
               {!plan.days.some((d: any) => d.activities && d.activities.some((a: any) => a.materials.length > 0)) && (
                 <p className="text-black italic print:text-sm">Sin materiales planeados.</p>
               )}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mt-16 print:mt-12 text-center pt-8 border-t-2 border-black">
             <div>
                <div className="border-b border-black mb-2 mx-12 h-16"></div>
                <p className="font-bold text-black print:text-sm">Educadora/Coordinadora del área para apoyo terapéutico</p>
                <p className="text-gray-600 text-sm print:text-xs">Nombre y firma</p>
             </div>
             <div>
                <div className="border-b border-black mb-2 mx-12 h-16"></div>
                <p className="font-bold text-black print:text-sm">Asistente educativa</p>
                <p className="text-gray-600 text-sm print:text-xs">Nombre y Firma</p>
             </div>
          </div>
          <p className="text-xs print:text-[10px] text-gray-500 mt-8 print:mt-4 text-justify">
             Nota: El lenguaje empleado en el presente documento no busca generar distinción alguna entre hombres y mujeres, por lo que las referencias o alusiones en la redacción hechas a un género representan a ambos sexos.
          </p>
        </div>

      </div>
    </div>
  );
};
