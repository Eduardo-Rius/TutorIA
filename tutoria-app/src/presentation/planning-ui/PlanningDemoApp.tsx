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

  const triggerRefresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="font-poppins text-text-primary min-h-screen bg-surface-soft pb-20">
      <div className="bg-[#f8f9fa] py-1.5 px-4 text-center text-xs print:hidden flex items-center justify-center gap-4 border-b border-gray-200/60">
        <span className="font-medium text-gray-400 uppercase tracking-widest text-[10px]">Modo Demo</span>
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

      <div className="max-w-6xl mx-auto w-full px-4 print:p-0">
        {role === 'TEACHER' && view === 'LIST' && <TeacherList service={service} onNew={() => setView('CREATE')} onSelect={(id) => { setSelectedPlanId(id); setView('CREATE'); }} refreshKey={refreshKey} />}
        {role === 'TEACHER' && view === 'CREATE' && <TeacherWizard service={service} source={source} planId={selectedPlanId} onBack={() => setView('LIST')} onSaved={triggerRefresh} />}
        {role === 'DIRECTOR' && view === 'LIST' && <DirectorList service={service} onSelect={(id) => { setSelectedPlanId(id); setView('REVIEW'); }} refreshKey={refreshKey} />}
        {role === 'DIRECTOR' && view === 'REVIEW' && <DirectorReview service={service} planId={selectedPlanId!} onBack={() => setView('LIST')} onSaved={triggerRefresh} />}
        {role === 'SUPERVISOR' && view === 'LIST' && <SupervisorList service={service} onSelect={(id) => { setSelectedPlanId(id); setView('PRINT'); }} refreshKey={refreshKey} />}
        {view === 'PRINT' && <PrintableView service={service} planId={selectedPlanId!} onBack={() => setView('LIST')} />}
      </div>
    </div>
  );
};

const TeacherList = ({ service, onNew, onSelect, refreshKey }: { service: PlanningWorkflowService, onNew: () => void, onSelect: (id: string) => void, refreshKey: number }) => {
  const [plans, setPlans] = useState<WeeklyPlanning[]>([]);
  useEffect(() => { service.listTeacherPlanning('t1').then(setPlans); }, [refreshKey, service]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
      <h2 className="text-5xl font-bold mb-6 text-brand-dark tracking-tight">Hola Anita 👋</h2>
      <p className="text-2xl text-text-muted mb-8 max-w-xl leading-relaxed">
        Vamos a preparar tu semana.<br/>
        Del 10 al 14 de agosto para <span className="font-bold text-text-primary">Lactantes C</span>.
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

const TeacherWizard = ({ service, source, planId, onBack, onSaved }: { service: PlanningWorkflowService, source: PedagogicalRecommendationSource, planId: string | null, onBack: () => void, onSaved: () => void }) => {
  const [stage, setStage] = useState<1 | 1.5 | 2 | 3>(1);
  const [obs, setObs] = useState('');
  const [needs, setNeeds] = useState('');
  const [specialConsiderations, setSpecialConsiderations] = useState('');
  const [availableMaterials, setAvailableMaterials] = useState('');
  const [days, setDays] = useState<PlanningDay[]>([]);
  const [status, setStatus] = useState<string>('DRAFT');
  const [rejection, setRejection] = useState('');

  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  const stableIdRef = useRef(`p-demo-${Date.now()}`);
  const currentPlanId = planId || stableIdRef.current;

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [generationDone, setGenerationDone] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (planId) {
      service.getPlanning(planId).then(p => {
        if (p) {
          setObs(p.observations);
          setNeeds(p.identifiedNeeds);
          setDays(p.days);
          setStatus(p.status);
          if (p.status === 'REJECTED') {
            setRejection(p.reviewHistory[p.reviewHistory.length - 1]?.reason || '');
          }
          if (p.days.length > 0) {
            setGenerationDone(true);
          }
        }
      });
    } else {
      service.createPlanning(currentPlanId, 'd1', 'lactantes-c', 't1', MOCK_START, MOCK_END, 'TEACHER');
    }
  }, [planId, currentPlanId, service]);

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  const handleActiveListening = () => {
    setStage(1.5);
  };

  const handleRecommend = async () => {
    setIsGenerating(true);
    const recommended = await source.generateRecommendation(RoomCatalog.getRoom('lactantes-c')!, obs, needs);
    setDays(recommended);
    setIsGenerating(false);
    setGenerationDone(true);
    setIsDirty(true);
    setStage(2);
  };

  const handleSaveDraft = async () => {
    if (days.length === 5) {
      await service.saveDraft(currentPlanId, obs, needs, [], days, 'TEACHER');
    }
    setIsDirty(false);
    onSaved();
    setToastMessage('✓ Tu avance está protegido.');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSubmit = async () => {
    if (status === 'REJECTED') {
      await service.resubmit(currentPlanId, obs, needs, [], days, 'TEACHER');
    } else {
      if (days.length === 5) await service.saveDraft(currentPlanId, obs, needs, [], days, 'TEACHER');
      await service.submit(currentPlanId, 'TEACHER');
    }
    setStatus('IN_REVIEW');
    setToastMessage('🎉 ¡Listo! La Directora ya tiene nuestra propuesta.');
    onSaved();
    setTimeout(() => {
      setToastMessage('');
      onBack();
    }, 2500);
  };

  const readOnly = status === 'IN_REVIEW' || status === 'APPROVED';
  const showCorrections = status === 'REJECTED';
  const currentVisualStep = readOnly ? 4 : (stage === 1.5 ? 2 : Math.floor(stage));

  return (
    <div className="flex flex-col relative animate-fade-in pb-20">
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl z-50 font-bold flex items-center gap-3 text-lg">
          {toastMessage}
        </div>
      )}

      <div className="flex items-center justify-between mb-10">
        <button onClick={onBack} className="text-text-muted hover:text-gray-800 font-bold px-4 py-2 rounded-full hover:bg-gray-200 transition">← Volver al inicio</button>
      </div>

      <div className="flex justify-between items-center max-w-3xl mx-auto mb-16 relative w-full px-4">
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-gray-200 -z-10"></div>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-surface-ivory0 -z-10 transition-all duration-500" style={{ width: `calc(${((currentVisualStep - 1) / 3) * 100}% - 2rem)` }}></div>

        {VISUAL_STEPS.map((s, i) => {
           const stepNum = i + 1;
           const active = currentVisualStep >= stepNum;
           const current = currentVisualStep === stepNum;
           return (
             <div key={s} className="flex flex-col items-center gap-3 bg-surface-soft px-3">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${active ? 'bg-brand-primary text-white' : 'bg-gray-200 text-text-muted'} ${current ? 'ring-4 ring-teal-100' : ''}`}>
                 {stepNum}
               </div>
               <span className={`text-sm font-bold ${active ? 'text-teal-900' : 'text-gray-400'}`}>{s}</span>
             </div>
           )
        })}
      </div>

      {showCorrections && stage === 1 && (
        <div className="max-w-2xl mx-auto mb-10 bg-orange-50 border-2 border-orange-200 p-8 rounded-xl w-full">
          <p className="font-bold text-orange-900 mb-3 text-lg">La Directora dejó una sugerencia para fortalecer esta propuesta.</p>
          <p className="text-orange-900 mb-6 text-base">Revisémosla juntas:</p>
          <p className="text-status-adjustment text-xl font-medium italic bg-white p-6 rounded-lg">"{rejection}"</p>
        </div>
      )}

      {stage === 1 && (
        <div className="max-w-2xl mx-auto w-full">
          <div className="bg-white p-10 rounded-xl shadow-sm border border-border-soft">
            <div className="mb-10 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-50 rounded-lg transition p-2">
              <label htmlFor="obs" className="block text-2xl font-bold mb-4 text-brand-dark">¿Qué observaste en tu grupo?</label>

              <div className="text-text-muted mb-6 text-base font-medium bg-surface-soft p-6 rounded-lg">
                <p>Puedes contarme qué llamó tu atención, cómo participaron, qué les interesó o dónde necesitaron más acompañamiento.</p>
              </div>

              <textarea id="obs" disabled={readOnly} value={obs} onChange={e => {setObs(e.target.value); setIsDirty(true);}} placeholder="Te escucho..." className="w-full text-xl p-4 bg-surface-soft border border-border-default rounded-lg outline-none min-h-[140px] disabled:opacity-50 focus:border-brand-primary focus:bg-white transition resize-none" />
            </div>

            <div className="w-full h-px bg-status-draft/30 my-8"></div>

            <div className="mb-10 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-50 rounded-lg transition p-2">
              <label htmlFor="needs" className="block text-2xl font-bold mb-4 text-brand-dark">¿Qué necesitas fortalecer esta semana?</label>
              <textarea id="needs" disabled={readOnly} value={needs} onChange={e => {setNeeds(e.target.value); setIsDirty(true);}} placeholder="Por ejemplo: el seguimiento de indicaciones..." className="w-full text-xl p-4 bg-surface-soft border border-border-default rounded-lg outline-none min-h-[120px] disabled:opacity-50 focus:border-brand-primary focus:bg-white transition resize-none" />
            </div>

            <div className="w-full h-px bg-status-draft/30 my-8"></div>

            <div className="mb-10 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-50 rounded-lg transition p-2">
              <label htmlFor="specialConsiderations" className="block text-2xl font-bold mb-4 text-brand-dark">Algo que quiero tener presente</label>
              <div className="text-text-muted mb-6 text-base font-medium">
                <p>Opcional. Por ahora esta información te sirve solo como referencia durante la edición (no se guarda en el sistema).</p>
              </div>
              <textarea id="specialConsiderations" disabled={readOnly} value={specialConsiderations} onChange={e => {setSpecialConsiderations(e.target.value); setIsDirty(true);}} placeholder="Ej. Cambio de rutina, simulacro..." className="w-full text-xl p-4 bg-surface-soft border border-border-default rounded-lg outline-none min-h-[100px] disabled:opacity-50 focus:border-brand-primary focus:bg-white transition resize-none" />
            </div>

            <div className="w-full h-px bg-status-draft/30 my-8"></div>

            <div className="focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-50 rounded-lg transition p-2">
              <label htmlFor="availableMaterials" className="block text-2xl font-bold mb-4 text-brand-dark">Materiales que tengo a la mano</label>
              <div className="text-text-muted mb-6 text-base font-medium">
                <p>Opcional. Te servirá como referencia al revisar las actividades propuestas (no se guarda en el sistema ni altera la propuesta).</p>
              </div>
              <textarea id="availableMaterials" disabled={readOnly} value={availableMaterials} onChange={e => {setAvailableMaterials(e.target.value); setIsDirty(true);}} placeholder="Ej. Sonajas, pelotas, bloques suaves..." className="w-full text-xl p-4 bg-surface-soft border border-border-default rounded-lg outline-none min-h-[100px] disabled:opacity-50 focus:border-brand-primary focus:bg-white transition resize-none" />
            </div>
          </div>

          {!readOnly && (
            <div className="mt-12 text-center flex flex-col items-center">
               <button onClick={handleActiveListening} disabled={!obs || !needs} className="bg-brand-primary hover:bg-brand-dark focus:ring-4 focus:ring-brand-primary/30 text-white font-bold text-2xl px-12 py-6 rounded-full shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-3 w-full max-w-md mx-auto mb-6">
                 Crear propuesta juntas
               </button>

               {isDirty && (
                 <button onClick={handleSaveDraft} className="text-teal-700 font-bold hover:bg-surface-ivory px-6 py-3 rounded-full transition text-lg mt-4">Guardar mi avance por hoy</button>
               )}
            </div>
          )}

          {readOnly && days.length === 5 && (
            <div className="mt-12 text-center flex flex-col items-center">
               <button onClick={() => setStage(2)} className="bg-brand-primary hover:bg-brand-dark focus:ring-4 focus:ring-brand-primary/30 text-white font-bold text-xl px-12 py-5 rounded-full shadow-sm transition w-full max-w-sm mx-auto mb-6">
                 Ver nuestra propuesta semanal
               </button>
            </div>
          )}
        </div>
      )}

      {stage === 1.5 && (
        <div className="max-w-2xl mx-auto w-full bg-white p-12 rounded-xl shadow-sm border border-brand-primary/20 mt-10">
           <h3 className="text-3xl font-bold mb-8 text-brand-dark text-center">Lo que entendí de tu grupo</h3>

           <div className="bg-surface-soft p-6 rounded-lg mb-8 space-y-6 text-left">
             <div>
               <p className="text-sm font-bold text-text-muted uppercase tracking-wider mb-2">Observé que:</p>
               <p className="text-xl text-gray-800 font-medium">{obs || 'El grupo responde bien a indicaciones, pero requiere modelado.'}</p>
             </div>
             <div>
               <p className="text-sm font-bold text-text-muted uppercase tracking-wider mb-2">Esta semana quieres fortalecer:</p>
               <p className="text-xl text-gray-800 font-medium">{needs || 'El seguimiento de indicaciones sencillas.'}</p>
             </div>
             <div>
               <p className="text-sm font-bold text-text-muted uppercase tracking-wider mb-2">Grupo:</p>
               <p className="text-xl text-gray-800 font-medium">Lactantes C</p>
             </div>
             <div>
               <p className="text-sm font-bold text-text-muted uppercase tracking-wider mb-2">Edad:</p>
               <p className="text-xl text-gray-800 font-medium">13–18 meses</p>
             </div>
           </div>

           <p className="text-xl text-gray-700 font-bold mb-10 text-center">
             Con esto puedo preparar una primera propuesta para la semana.
           </p>

           {!isGenerating ? (
             <div className="flex flex-col gap-4">
               <button onClick={handleRecommend} className="bg-brand-primary hover:bg-brand-dark focus:ring-4 focus:ring-brand-primary/30 text-white font-bold text-2xl px-12 py-6 rounded-full shadow-sm transition w-full text-center">
                 Sí, construyamos la semana
               </button>
               <button onClick={() => setStage(1)} className="text-teal-700 font-bold hover:bg-surface-ivory px-6 py-4 rounded-full transition text-lg w-full text-center">
                 Quiero ajustar algo
               </button>
             </div>
           ) : (
             <div className="text-teal-700 font-bold text-xl h-8 text-center mt-6">
               {LOADING_MESSAGES[loadingMsgIdx]}
             </div>
           )}
        </div>
      )}

      {stage === 2 && (
        <div className="w-full">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-4xl font-bold text-text-primary">Nuestra propuesta pedagógica</h3>
            {!readOnly && (
              <button onClick={handleSaveDraft} className="text-teal-700 font-bold hover:bg-surface-ivory px-6 py-3 rounded-full transition text-lg border-2 border-transparent hover:border-brand-primary/20">Proteger mi avance</button>
            )}
          </div>

          <div className="bg-surface-ivory border-2 border-brand-primary/20 rounded-xl p-8 mb-10 text-teal-900 max-w-4xl mx-auto">
            <h4 className="font-bold text-sm uppercase tracking-wider mb-2 text-teal-700">Propósito de la semana</h4>
            <p className="text-2xl font-medium leading-relaxed italic">
              "Favorecer {needs ? needs.toLowerCase() : 'el aprendizaje'} a través de experiencias basadas en: {obs ? obs : 'las observaciones de esta semana'}."
            </p>
          </div>

          <div className="space-y-8 pb-8 max-w-4xl mx-auto">
            {days.length > 0 && (
              <>
                <WeekDayTabs
                  days={days}
                  activeIndex={activeDayIndex}
                  onSelect={(idx) => {
                    setActiveDayIndex(idx);
                    setExpandedActivityId(null);
                  }}
                />

                {(() => {
                  const d = days[activeDayIndex];
                  if (!d) return null;
                  const dIdx = activeDayIndex;

                  const commonWeeklyMaterials = getCommonWeeklyMaterials(days);
                  const dailyMaterials = getDaySpecificMaterials(d, commonWeeklyMaterials);

                  const dayName = d.dayOfWeek === 'MONDAY' ? 'Lunes' :
                                  d.dayOfWeek === 'TUESDAY' ? 'Martes' :
                                  d.dayOfWeek === 'WEDNESDAY' ? 'Miércoles' :
                                  d.dayOfWeek === 'THURSDAY' ? 'Jueves' : 'Viernes';

                  return (
                    <div key={d.dayOfWeek} id={`panel-${d.dayOfWeek}`} role="tabpanel" className="w-full bg-white rounded-xl shadow-sm border border-border-soft p-8 md:p-12 animate-fade-in-up">
                       <h4 className="text-3xl font-bold text-teal-900 mb-2 uppercase tracking-widest text-center">
                         {dayName}
                       </h4>

                       <p className="text-center text-teal-700 font-medium italic mb-10 border-b-2 border-teal-50 pb-6">
                         {d.dayOfWeek === 'MONDAY' && 'Comenzamos con indicaciones sencillas y modelado.'}
                         {d.dayOfWeek === 'TUESDAY' && 'Reforzamos la respuesta mediante juego e imitación.'}
                         {d.dayOfWeek === 'WEDNESDAY' && 'Incorporamos movimiento y desplazamiento.'}
                         {d.dayOfWeek === 'THURSDAY' && 'Combinamos indicaciones con exploración de materiales.'}
                         {d.dayOfWeek === 'FRIDAY' && 'Cerramos retomando lo trabajado durante la semana.'}
                       </p>

                       <div className="space-y-4">
                         {d.activities.map((a, j) => {
                            const isExpanded = expandedActivityId === a.activityId;
                            return (
                              <div key={a.activityId} className="bg-surface-soft rounded-xl border border-border-soft overflow-hidden transition">
                                <button
                                  onClick={() => setExpandedActivityId(isExpanded ? null : a.activityId)}
                                  aria-expanded={isExpanded}
                                  aria-controls={`editor-${a.activityId}`}
                                  className="w-full text-left p-6 hover:bg-surface-ivory transition flex justify-between items-center group outline-none focus:ring-4 focus:ring-brand-primary/30"
                                >
                                  <div>
                                    <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">{a.category} • {a.durationMinutes} min</p>
                                    <p className="font-bold text-text-primary text-xl group-hover:text-teal-800 transition">{a.objective}</p>
                                  </div>
                                  <div className="text-teal-600 font-medium px-4 py-2 rounded-full bg-white border border-teal-100 shadow-sm flex-shrink-0 transition group-hover:bg-teal-50">
                                    {isExpanded ? 'Ocultar' : 'Editar'}
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div id={`editor-${a.activityId}`} className="px-6 pb-6 pt-2 border-t border-teal-50 bg-white animate-fade-in">
                                    <div className="mb-6 bg-surface-ivory p-4 rounded-xl border border-brand-primary/20 mt-4">
                                      <p className="text-brand-dark text-sm italic font-medium">Esta actividad apoya el propósito de la semana al buscar favorecer {needs ? needs.toLowerCase() : 'el aprendizaje'}.</p>
                                    </div>

                                    <div className="mb-6">
                                      <label htmlFor={`desc-${d.dayOfWeek}-${a.activityId}`} className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2 block">Actividad</label>
                                      <textarea id={`desc-${d.dayOfWeek}-${a.activityId}`} disabled={readOnly} value={a.description} onChange={e => {
                                          const newDays = days.map((day, ix) => {
                                             if (ix !== dIdx) return day;
                                             const newActivities = day.activities.map((act, ax) => {
                                                if (ax !== j) return act;
                                                return { ...act, description: e.target.value };
                                             });
                                             return { ...day, activities: newActivities };
                                          });
                                          setDays(newDays);
                                          setIsDirty(true);
                                       }} className="w-full text-base p-4 bg-white border border-border-default focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 rounded-lg outline-none min-h-[160px] resize-y disabled:opacity-50 transition" />
                                    </div>

                                    <div>
                                      <label htmlFor={`mat-${d.dayOfWeek}-${a.activityId}`} className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2 block">Materiales</label>
                                      <input id={`mat-${d.dayOfWeek}-${a.activityId}`} disabled={readOnly} value={a.materials.join(', ')} onChange={e => {
                                          const newDays = days.map((day, ix) => {
                                             if (ix !== dIdx) return day;
                                             const newActivities = day.activities.map((act, ax) => {
                                                if (ax !== j) return act;
                                                return { ...act, materials: e.target.value.split(',').map(s=>s.trim()).filter(s=>s.length > 0) };
                                             });
                                             return { ...day, activities: newActivities };
                                          });
                                          setDays(newDays);
                                          setIsDirty(true);
                                       }} className="w-full text-base p-4 bg-white border border-border-default focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 rounded-lg outline-none disabled:opacity-50 transition" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                         })}
                       </div>

                       <div className="mt-12 border-t border-border-soft pt-10">
                         {commonWeeklyMaterials.length > 0 && (
                           <div className="mb-10">
                             <h5 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                               <span className="w-2 h-2 rounded-full bg-brand-primary"></span>
                               Materiales de uso diario
                             </h5>
                             <ul className="list-none space-y-3">
                               {commonWeeklyMaterials.map((m, i) => (
                                 <li key={`${m}-${i}`} className="text-lg text-text-primary font-medium flex items-start gap-3">
                                   <span className="text-brand-primary mt-1">•</span>
                                   <span>{m}</span>
                                 </li>
                               ))}
                             </ul>
                           </div>
                         )}

                         <div>
                           <h5 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-brand-secondary"></span>
                             Materiales para el {dayName.toLowerCase()}
                           </h5>
                           {dailyMaterials.length > 0 ? (
                             <ul className="list-none space-y-3">
                               {dailyMaterials.map((m, i) => (
                                 <li key={`${m}-${i}`} className="text-lg text-text-primary font-medium flex items-start gap-3">
                                   <span className="text-brand-secondary mt-1">•</span>
                                   <span>{m}</span>
                                 </li>
                               ))}
                             </ul>
                           ) : commonWeeklyMaterials.length > 0 ? (
                             <p className="text-text-muted italic text-base bg-surface-warm p-4 rounded-lg border border-border-soft">Para este día se utilizarán los materiales de uso diario.</p>
                           ) : (
                             <p className="text-text-muted italic text-base bg-surface-warm p-4 rounded-lg border border-border-soft">No hay materiales registrados para este día.</p>
                           )}
                         </div>
                       </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>



          <div className="bg-white rounded-xl shadow-sm border border-border-soft p-8 md:p-12 max-w-4xl mx-auto mb-10">
             <h4 className="text-3xl font-bold text-teal-900 border-b-2 border-teal-50 pb-4 mb-6 uppercase tracking-widest text-center">Evaluación de la semana</h4>
             <p className="text-xl text-text-muted text-center italic">
               "Este espacio estará disponible para registrar cómo respondió el grupo una vez realizadas las actividades."
             </p>
          </div>

          <div className="mt-12 text-center flex flex-col items-center">
             <button onClick={() => setStage(3)} className="bg-brand-primary hover:bg-brand-dark focus:ring-4 focus:ring-brand-primary/30 text-white font-bold text-xl px-12 py-5 rounded-full shadow-sm transition w-full max-w-sm mx-auto mb-6">
               Ver resumen y compartir
             </button>
          </div>
        </div>
      )}

      {stage === 3 && (
        <div className="max-w-2xl mx-auto w-full text-center">
          <h3 className="text-4xl font-bold mb-8 text-text-primary">
            {readOnly ? 'El resumen de nuestra semana' : '¿Listas para compartirla?'}
          </h3>
          <div className="bg-white p-12 rounded-xl shadow-sm border border-border-soft mb-8">
            <p className="text-xl text-text-muted mb-10 leading-relaxed">
              {readOnly
                ? (status === 'APPROVED' ? '¡Qué buena noticia! Esta propuesta fue aprobada. Gracias por el tiempo y el cariño que dedicas a preparar experiencias para tu grupo.' : 'La Directora la está leyendo en este momento. Te avisaré cuando nos comente algo.')
                : 'La Directora podrá leer lo que construimos juntas para esta semana.'}
            </p>
            {!readOnly && (
              <button onClick={handleSubmit} disabled={days.length !== 5} className="bg-brand-primary hover:bg-brand-dark focus:ring-4 focus:ring-brand-primary/30 text-white font-bold text-2xl px-12 py-6 rounded-full shadow-sm transition w-full">
                Compartir con la Directora
              </button>
            )}
            <button onClick={() => setStage(2)} className="mt-8 text-teal-700 font-bold hover:bg-surface-ivory px-6 py-3 rounded-full transition text-lg">Revisar las actividades otra vez</button>
          </div>
        </div>
      )}
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

const DirectorReview = ({ service, planId, onBack, onSaved }: { service: PlanningWorkflowService, planId: string, onBack: () => void, onSaved: () => void }) => {
  const [plan, setPlan] = useState<WeeklyPlanning | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [activityObservations, setActivityObservations] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => { service.getPlanning(planId).then(setPlan); }, [planId, service]);
  if (!plan) return <p className="p-8 text-center text-xl">Leyendo la propuesta...</p>;

  return (
    <div className="max-w-5xl mx-auto pb-32 animate-fade-in">
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl z-50 font-bold flex items-center gap-3 text-lg">
          {toastMessage}
        </div>
      )}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-text-muted hover:text-gray-800 font-bold px-4 py-2 rounded-full hover:bg-gray-200 transition">← Volver al listado</button>
        {plan.status === 'APPROVED' && <span className="bg-gray-200 text-gray-700 font-bold px-4 py-1.5 rounded-full text-sm">Propuesta aprobada</span>}
      </div>

      <div className="text-center mb-12">
        <h2 className="text-5xl font-bold mb-4">Anita</h2>
        <p className="text-text-muted font-bold text-2xl uppercase tracking-widest">Lactantes C</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border-soft p-10 mb-12">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wider mb-4">Lo que observó en el grupo</h4>
            <p className="font-medium text-xl leading-relaxed text-text-primary">{plan.observations || 'Sin observaciones registradas.'}</p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wider mb-4">Necesidad pedagógica</h4>
            <p className="font-medium text-xl leading-relaxed text-text-primary">{plan.identifiedNeeds || 'Sin necesidad específica registrada.'}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface-ivory rounded-xl shadow-sm border border-brand-primary/20 p-10 mb-12 text-center">
         <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wider mb-4">Propósito de la semana</h4>
         <p className="font-medium text-2xl leading-relaxed text-text-primary italic">
           "Favorecer {plan.identifiedNeeds ? plan.identifiedNeeds.toLowerCase() : 'el aprendizaje'} a través de experiencias basadas en: {plan.observations ? plan.observations : 'las necesidades del grupo'}."
         </p>
      </div>

      <h3 className="text-3xl font-bold mb-8 text-text-primary text-center">Desarrollo de las acciones pedagógicas</h3>

      <div className="space-y-8 pb-8 max-w-4xl mx-auto">
        <WeekDayTabs
          days={plan.days}
          activeIndex={activeDayIndex}
          onSelect={(idx) => {
            setActiveDayIndex(idx);
            setExpandedActivityId(null);
          }}
        />

        {(() => {
          const d = plan.days[activeDayIndex];
          if (!d) return null;

          const commonWeeklyMaterials = getCommonWeeklyMaterials(plan.days);
          const dailyMaterials = getDaySpecificMaterials(d, commonWeeklyMaterials);

          const dayName = d.dayOfWeek === 'MONDAY' ? 'Lunes' :
                          d.dayOfWeek === 'TUESDAY' ? 'Martes' :
                          d.dayOfWeek === 'WEDNESDAY' ? 'Miércoles' :
                          d.dayOfWeek === 'THURSDAY' ? 'Jueves' : 'Viernes';

          return (
            <div key={d.dayOfWeek} id={`panel-${d.dayOfWeek}`} role="tabpanel" className="w-full bg-white rounded-xl shadow-sm border border-border-soft p-8 md:p-12 animate-fade-in-up">
               <h4 className="text-3xl font-bold text-teal-900 mb-2 uppercase tracking-widest text-center">
                 {dayName}
               </h4>
               <p className="text-center text-teal-700 font-medium italic mb-10 border-b-2 border-teal-50 pb-6">
                 {DAY_CONTEXT[d.dayOfWeek]}
               </p>

               <div className="space-y-4">
                 {d.activities.map((a) => {
                    const isExpanded = expandedActivityId === a.activityId;
                    return (
                      <div key={a.activityId} className="bg-surface-soft rounded-xl border border-border-soft overflow-hidden transition">
                        <button
                          onClick={() => setExpandedActivityId(isExpanded ? null : a.activityId)}
                          aria-expanded={isExpanded}
                          aria-controls={`review-${a.activityId}`}
                          className="w-full text-left p-6 hover:bg-surface-ivory transition flex justify-between items-center group outline-none focus:ring-4 focus:ring-brand-primary/30"
                        >
                          <div>
                            <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">{a.category} • {a.durationMinutes} min</p>
                            <p className="font-bold text-text-primary text-xl group-hover:text-teal-800 transition">{a.objective}</p>
                          </div>
                          <div className="text-teal-600 font-medium px-4 py-2 rounded-full bg-white border border-teal-100 shadow-sm flex-shrink-0 transition group-hover:bg-teal-50">
                            {isExpanded ? 'Ocultar' : 'Revisar'}
                          </div>
                        </button>

                        {isExpanded && (
                          <div id={`review-${a.activityId}`} className="px-6 pb-6 pt-2 border-t border-teal-50 bg-white animate-fade-in">
                            <div className="mb-5">
                              <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2 mt-4 block">Objetivo</p>
                              <p className="font-bold text-text-primary text-lg">{a.objective}</p>
                            </div>
                            <div className="mb-5">
                              <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2 block">Actividad</p>
                              <p className="text-base text-gray-800 leading-relaxed">{a.description}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2 block">Materiales</p>
                              <p className="text-base font-bold text-text-primary">{a.materials.length > 0 ? a.materials.join(', ') : 'Ninguno registrado'}</p>
                            </div>

                            <div className="mt-8 border-t border-teal-50 pt-6">
                              {activityObservations[`${d.dayOfWeek}-${a.activityId}`] !== undefined ? (
                                <div className="bg-orange-50 p-5 rounded-xl border border-orange-200">
                                  <label htmlFor={`obs-${a.activityId}`} className="block text-sm font-bold text-orange-900 uppercase tracking-wider mb-3">
                                    Observación para Anita sobre esta actividad
                                  </label>
                                  <textarea
                                    id={`obs-${a.activityId}`}
                                    value={activityObservations[`${d.dayOfWeek}-${a.activityId}`]}
                                    onChange={e => setActivityObservations({ ...activityObservations, [`${d.dayOfWeek}-${a.activityId}`]: e.target.value })}
                                    className="w-full text-base p-4 bg-white border border-orange-300 focus:border-orange-500 rounded-lg outline-none transition min-h-[100px] resize-none mb-3"
                                    placeholder="Escribe aquí tu observación..."
                                  />
                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => {
                                        const newObs = { ...activityObservations };
                                        delete newObs[`${d.dayOfWeek}-${a.activityId}`];
                                        setActivityObservations(newObs);
                                      }}
                                      className="text-orange-700 hover:text-orange-900 font-bold text-sm underline"
                                    >
                                      Quitar observación
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setActivityObservations({ ...activityObservations, [`${d.dayOfWeek}-${a.activityId}`]: '' })}
                                  className="text-orange-700 hover:text-orange-900 font-bold text-sm flex items-center gap-2 px-5 py-2.5 rounded-full hover:bg-orange-50 transition border border-transparent hover:border-orange-200"
                                >
                                  + Agregar observación
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                 })}
               </div>

               <div className="mt-12 border-t border-border-soft pt-10">
                 {commonWeeklyMaterials.length > 0 && (
                   <div className="mb-10">
                     <h5 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-brand-primary"></span>
                       Materiales de uso diario
                     </h5>
                     <ul className="list-none space-y-3">
                       {commonWeeklyMaterials.map(m => (
                         <li key={m} className="flex items-center gap-3 text-lg text-gray-800 font-medium">
                           <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                           {m}
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}

                 <div>
                   <h5 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-brand-accent"></span>
                     Materiales previstos para el {dayName.toLowerCase()}
                   </h5>
                   {dailyMaterials.length > 0 ? (
                     <ul className="list-none space-y-3">
                       {dailyMaterials.map(m => (
                         <li key={m} className="flex items-center gap-3 text-lg text-gray-800 font-medium">
                           <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                           {m}
                         </li>
                       ))}
                     </ul>
                   ) : (
                     <p className="text-text-muted italic bg-surface-soft p-4 rounded-lg inline-block">
                       Para este día se utilizarán los materiales de uso diario.
                     </p>
                   )}
                 </div>
               </div>
            </div>
          );
        })()}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border-soft p-10 mb-12">
         <h4 className="text-2xl font-bold text-teal-900 border-b-2 border-teal-50 pb-4 mb-6 uppercase tracking-widest text-center">Evaluación de la semana</h4>
         <p className="text-xl text-text-muted text-center italic">
           "Este espacio estará disponible para registrar cómo respondió el grupo una vez realizadas las actividades."
         </p>
      </div>

      {plan.status !== 'APPROVED' && (() => {
        const obsCount = Object.keys(activityObservations).length;
        return (
          <div className="mt-16 flex justify-center">
            <div className="flex flex-col gap-6 max-w-2xl w-full text-center">
              {obsCount > 0 && (
                <div className="bg-orange-50 p-6 rounded-xl border-2 border-orange-200 mb-4 text-left shadow-sm">
                  <h4 className="font-bold text-orange-900 text-lg mb-3">
                    Has registrado {obsCount} {obsCount === 1 ? 'observación' : 'observaciones'} en esta planeación.
                  </h4>
                  <ul className="list-disc pl-5 text-orange-800 space-y-1 font-medium">
                    {Object.keys(activityObservations).map(key => {
                      const [day, actId] = key.split('-');
                      const dayName = day === 'MONDAY' ? 'Lunes' : day === 'TUESDAY' ? 'Martes' : day === 'WEDNESDAY' ? 'Miércoles' : day === 'THURSDAY' ? 'Jueves' : 'Viernes';
                      const act = plan.days.find(d => d.dayOfWeek === day)?.activities.find(a => a.activityId === actId);
                      return <li key={key}>{dayName} · {act?.category}</li>;
                    })}
                  </ul>
                </div>
              )}

              <button onClick={async () => { await service.approve(planId, 'DIRECTOR'); onSaved(); setToastMessage('🌟 ¡Qué bien! Propuesta aprobada.'); setTimeout(() => { setToastMessage(''); onBack(); }, 2500); }} className="bg-brand-primary hover:bg-brand-dark text-white font-bold text-2xl px-12 py-6 rounded-full shadow-sm transition w-full">
                ✓ Aprobar planeación
              </button>

              {obsCount === 0 ? (
                 <div className="mt-2 text-center">
                   <button disabled className="bg-white text-orange-300 font-bold px-8 py-5 rounded-full w-full border-2 border-orange-100 text-xl cursor-not-allowed">
                     Solicitar ajustes
                   </button>
                   <p className="text-orange-600 mt-4 font-medium">Agrega al menos una observación en la actividad que requiere ajuste.</p>
                 </div>
              ) : (
                 <button onClick={async () => {
                   const summaryReason = `Has recibido ${obsCount} ${obsCount === 1 ? 'observación' : 'observaciones'} en actividades específicas.`;
                   await service.reject(planId, summaryReason, 'd1', 'DIRECTOR');
                   onSaved();
                   setToastMessage('✓ Le enviamos tu sugerencia a la docente');
                   setTimeout(() => { setToastMessage(''); onBack(); }, 2000);
                 }} className="bg-white text-orange-700 font-bold px-8 py-5 rounded-full hover:bg-orange-50 transition w-full border-2 border-orange-200 text-xl shadow-sm">
                   Solicitar ajustes
                 </button>
              )}
            </div>
          </div>
        );
      })()}
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

const PrintableView = ({ service, planId, onBack }: { service: PlanningWorkflowService, planId: string, onBack: () => void }) => {
  const [plan, setPlan] = useState<WeeklyPlanning | null>(null);
  useEffect(() => { service.getPlanning(planId).then(setPlan); }, [planId, service]);
  if (!plan) return null;

  return (
    <div className="bg-white print:p-0 font-serif">
      <div className="print:hidden mb-12 flex justify-between items-center p-6 bg-surface-soft border border-border-default rounded-xl">
        <button onClick={onBack} className="text-text-muted hover:text-text-primary font-bold px-6 py-3 rounded-full hover:bg-gray-200 transition text-lg">← Volver</button>
        <button onClick={() => window.print()} className="bg-gray-900 hover:bg-black text-white font-bold px-10 py-4 rounded-full shadow-sm text-lg transition">Guardar este documento</button>
      </div>

      <div className="print:block bg-white max-w-5xl mx-auto p-16 border border-border-default print:border-none print:shadow-none shadow-sm rounded-lg">
        <div className="border-b-4 border-gray-900 pb-8 mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-bold text-text-primary mb-4 tracking-tight">TutorIA</h1>
            <p className="text-2xl text-text-muted uppercase tracking-widest font-bold">Documento de planeación</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-6 py-2 border-4 border-green-800 text-status-approved font-bold uppercase tracking-widest text-lg rounded-lg">Planeación aprobada</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-16 text-xl">
          <div><span className="text-text-muted font-bold block text-sm uppercase tracking-wider mb-1">Centro</span><p className="font-bold text-text-primary">Guardería IMSS Demo</p></div>
          <div><span className="text-text-muted font-bold block text-sm uppercase tracking-wider mb-1">Docente estrella</span><p className="font-bold text-text-primary">Anita</p></div>
          <div><span className="text-text-muted font-bold block text-sm uppercase tracking-wider mb-1">Para el grupo de</span><p className="font-bold text-text-primary">Lactantes C (13–18 meses)</p></div>
          <div><span className="text-text-muted font-bold block text-sm uppercase tracking-wider mb-1">La semana del</span><p className="font-bold text-text-primary">10 al 14 de agosto de 2026</p></div>
        </div>

        <div className="mb-16 bg-surface-soft p-10 rounded-lg">
          <div className="mb-10"><span className="text-text-muted font-bold block text-sm uppercase mb-3 tracking-wider">Lo que Anita notó</span><p className="font-medium text-2xl leading-relaxed text-text-primary">"{plan.observations}"</p></div>
          <div><span className="text-text-muted font-bold block text-sm uppercase mb-3 tracking-wider">Nuestra meta a fortalecer</span><p className="font-medium text-2xl leading-relaxed text-text-primary">"{plan.identifiedNeeds}"</p></div>
        </div>

        <div className="mb-12 bg-surface-ivory border-2 border-brand-primary/20 rounded-xl p-8 text-center">
          <span className="text-teal-700 font-bold block text-sm uppercase mb-3 tracking-wider">Propósito de la semana</span>
          <p className="font-medium text-2xl leading-relaxed text-text-primary italic">
            "Favorecer {plan.identifiedNeeds ? plan.identifiedNeeds.toLowerCase() : 'el aprendizaje'} a través de experiencias basadas en: {plan.observations ? plan.observations : 'las necesidades del grupo'}."
          </p>
        </div>

        <div className="space-y-16">
          {plan.days.map(d => (
            <div key={d.dayOfWeek}>
               <h2 className="text-3xl font-bold border-b-2 border-gray-300 pb-3 mb-4 uppercase tracking-widest text-text-primary">
                 {d.dayOfWeek === 'MONDAY' && 'Lunes'}
                 {d.dayOfWeek === 'TUESDAY' && 'Martes'}
                 {d.dayOfWeek === 'WEDNESDAY' && 'Miércoles'}
                 {d.dayOfWeek === 'THURSDAY' && 'Jueves'}
                 {d.dayOfWeek === 'FRIDAY' && 'Viernes'}
               </h2>
               <p className="text-text-muted font-medium italic mb-8 text-xl">"{DAY_CONTEXT[d.dayOfWeek]}"</p>

              <div className="space-y-8">
                {d.activities.map(a => (
                  <div key={a.activityId} className="flex gap-8">
                    <div className="w-1/4">
                      <p className="font-bold text-text-primary uppercase text-sm mb-2 tracking-wider">{a.category}</p>
                      <p className="text-text-muted font-bold text-base">{a.durationMinutes} min</p>
                    </div>
                    <div className="w-3/4">
                      <p className="font-bold text-2xl mb-3 text-text-primary">{a.objective}</p>
                      <p className="text-gray-800 mb-5 leading-relaxed text-xl">{a.description}</p>
                      <p className="text-base font-bold text-text-muted uppercase tracking-wider">Materiales: <span className="font-bold text-text-primary normal-case">{a.materials.join(', ')}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-surface-soft p-10 rounded-lg">
           <h4 className="text-xl font-bold text-text-primary mb-6 uppercase tracking-widest">Materiales de la semana</h4>
           {Array.from(new Set(plan.days.flatMap(d => d.activities.flatMap(a => a.materials)))).length > 0 ? (
             <ul className="list-disc pl-5 space-y-2 text-xl text-gray-800">
               {Array.from(new Set(plan.days.flatMap(d => d.activities.flatMap(a => a.materials)))).map(m => <li key={m}>{m}</li>)}
             </ul>
           ) : (
             <p className="text-text-muted italic">No hay materiales especiales registrados.</p>
           )}
        </div>

        <div className="mt-24 pt-10 border-t border-gray-300 text-center text-base font-bold text-gray-400 uppercase tracking-widest">
          Diseñado con cuidado y cariño para nuestros niños.
        </div>
      </div>
    </div>
  );
};
