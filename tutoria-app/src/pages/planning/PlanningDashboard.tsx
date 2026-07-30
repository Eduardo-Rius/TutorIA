import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, LoadingState, EmptyState } from '../../components/layouts';
import { useMembership } from '../../providers/MembershipProvider';
import { Button } from '../../components/primitives';
import { Plus, MoreVertical, Check, FileText, Sparkles } from 'lucide-react';

export const PlanningDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { contextState } = useMembership();
  const activeContext = contextState.activeContext;

  if (!activeContext) {
    return <LoadingState text="Cargando tus planeaciones..." />;
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto w-full">
        {/* Header */}
        <header className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-[32px] font-poppins font-bold text-brandDark tracking-tight">
              Planeaciones
            </h1>
            <p className="text-gray-500 mt-1">
              Crea, gestiona y da seguimiento a tus propuestas pedagógicas
            </p>
          </div>
            <Button
              variant="primary"
              onClick={() => navigate('/workspace/planning/new')}
              className="rounded-full font-poppins font-semibold bg-brandPrimary hover:bg-[#008F82] h-12 px-7 hover:-translate-y-0.5 transition-all shadow-lg shadow-brandPrimary/20"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={20} className="text-white" />
                Nueva planeación
              </span>
            </Button>
          </header>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            <button className="border-b-2 border-brandPrimary py-4 px-1 text-sm font-semibold text-brandPrimary font-poppins">
              Mis planeaciones
            </button>
            <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 font-poppins transition-colors">
              Borradores
            </button>
            <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 font-poppins transition-colors">
              Aprobadas
            </button>
            <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 font-poppins transition-colors">
              Historial
            </button>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">

            {/* Continuar trabajando */}
            <section>
              <h3 className="text-lg font-poppins font-semibold text-brandDark mb-4">Continuar trabajando</h3>
              <div className="bg-white border border-gray-100 rounded-[24px] p-6 shadow-sm flex items-center justify-between hover:shadow-md hover:border-gray-200 transition-all group">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-brandSecondary/10 text-brandSecondary rounded-[12px] flex items-center justify-center shrink-0">
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-poppins font-semibold text-gray-900">Comprendamos tu contexto</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-brandSecondary/10 text-brandSecondary">En progreso</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">Maternal B • Iniciada hace 15 min</p>
                    <div className="flex items-center gap-3">
                      <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brandSecondary w-[45%] rounded-full"></div>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">45%</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/workspace/planning/new')}
                  className="rounded-full font-poppins font-semibold border-gray-200 text-gray-700 hover:bg-gray-50 h-10 px-6 hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100"
                >
                  Continuar
                </Button>
              </div>
            </section>

            {/* Recientes */}
            <section>
              <h3 className="text-lg font-poppins font-semibold text-brandDark mb-4">Recientes</h3>

              <EmptyState
                title="Aún no hay planeaciones recientes"
                description="Tus planeaciones, borradores y experiencias recientes aparecerán aquí."
                actionLabel="Comenzar ahora"
                onAction={() => navigate('/workspace/planning/new')}
              />
            </section>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Resumen del grupo */}
            <div className="bg-surfaceLight rounded-[16px] p-6">
              <h3 className="text-base font-poppins font-semibold text-brandDark mb-1">Resumen del grupo</h3>
              <p className="text-sm text-gray-500 mb-6">Maternal B</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[20px] shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <span className="block text-3xl font-bold text-brandSecondary font-poppins mb-1">12</span>
                  <span className="text-xs text-gray-500 font-medium">Estudiantes</span>
                </div>
                <div className="bg-white p-5 rounded-[20px] shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <span className="block text-3xl font-bold text-brandDark font-poppins mb-1">8</span>
                  <span className="text-xs text-gray-500 font-medium">Experiencias</span>
                </div>
                <div className="bg-white p-5 rounded-[20px] shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <span className="block text-3xl font-bold text-warning font-poppins mb-1">5</span>
                  <span className="text-xs text-gray-500 font-medium">Planeaciones</span>
                </div>
                <div className="bg-white p-5 rounded-[20px] shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <span className="block text-3xl font-bold text-success font-poppins mb-1">98%</span>
                  <span className="text-xs text-gray-500 font-medium">Participación</span>
                </div>
              </div>
            </div>

            {/* Conocimiento que crece */}
            <div className="bg-surfaceSuccess/30 rounded-[16px] p-6 border border-success/10 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-base font-poppins font-semibold text-brandDark mb-2">Conocimiento que crece</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Gracias a ti y a tu equipo hemos construido:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={16} className="text-success" />
                    <span className="font-semibold">24</span> experiencias compartidas
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={16} className="text-success" />
                    <span className="font-semibold">15</span> planeaciones aprobadas
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={16} className="text-success" />
                    <span className="font-semibold">8</span> recursos institucionales
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={16} className="text-success" />
                    <span className="font-semibold">12</span> docentes colaborando
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
