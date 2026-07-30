import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, LoadingState } from '../../components/layouts';
import { useMembership } from '../../providers/MembershipProvider';
import { Bell, Plus, Book, Search, BarChart2, ArrowRight, Sparkles } from 'lucide-react';
import { useSession } from '../../providers/SessionProvider';
import { TutorIAPresence, ExperienceContext } from '../../presentation/experience';

export const OperationalWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { contextState } = useMembership();
  const { session } = useSession();

  const activeContext = contextState.activeContext;

  if (!activeContext) {
    return <LoadingState text="Preparando tu espacio institucional..." />;
  }

  const secondaryActions = [
    {
      title: 'Nueva planeación',
      description: 'Crea una experiencia de aprendizaje',
      icon: Plus,
      color: 'text-brandPrimary',
      bgColor: 'bg-brandPrimary/10',
      action: () => navigate('/workspace/planning/new')
    },
    {
      title: 'Registrar experiencia',
      description: 'Documenta un momento significativo',
      icon: Book,
      color: 'text-brandSecondary',
      bgColor: 'bg-brandSecondary/10',
      action: () => {}
    },
    {
      title: 'Consultar conocimiento',
      description: 'Explora lo que la institución recuerda',
      icon: Search,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      action: () => {}
    },
    {
      title: 'Ver analítica',
      description: 'Descubre insights de tu comunidad',
      icon: BarChart2,
      color: 'text-[#8B5CF6]', // Purple
      bgColor: 'bg-[#8B5CF6]/10',
      action: () => {}
    }
  ];

  const experienceContext: ExperienceContext = {
    scene: 'workspace-reception',
    lifecycleState: 'PENDING_WORK',
    hasPendingWork: true,
    isFirstVisit: false,
    primaryAction: {
      id: 'resume_planning',
      label: 'Continuar Planeación',
      enabled: true,
      target: '/workspace/planning'
    }
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-6xl mx-auto w-full min-h-screen flex flex-col gap-8">

        {/* Topbar / Context Bar */}
        <header className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-3xl font-poppins font-bold text-brandDark tracking-tight">Mi espacio 👋</h1>
            <p className="text-gray-500 mt-1">Centro Infantil TutorIA · Maternal B</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-full shadow-sm border border-gray-100 flex items-center justify-center relative cursor-pointer hover:shadow-md transition-all">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-danger rounded-full ring-2 ring-white"></span>
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-[16px] shadow-sm border border-gray-100 cursor-pointer hover:border-gray-200 hover:shadow-md transition-all duration-300">
              <div className="w-9 h-9 bg-surfaceLight rounded-lg flex items-center justify-center text-brandPrimary">
                <span className="font-bold text-xs">CI</span>
              </div>
              <div className="pr-2 text-left">
                <p className="text-sm font-semibold text-brandDark leading-tight">Centro Infantil TutorIA</p>
                <p className="text-xs text-gray-500 font-medium">Guardería Demo 001</p>
              </div>
            </div>
          </div>
        </header>

        {/* Companion Hero Experience (Phase B2) */}
        <section className="w-full flex-shrink-0 relative z-10">
          <TutorIAPresence
            context={experienceContext}
            onAction={(action) => {
              if (action.target) {
                navigate(action.target);
              }
            }}
          />
        </section>

        {/* Secondary Navigation / Exploration */}
        <section className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {secondaryActions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.action}
                className="bg-white p-6 rounded-[24px] border border-gray-100 text-left hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 group flex items-start gap-5 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${action.bgColor} group-hover:scale-105 transition-transform duration-300`}>
                  <action.icon size={26} className={action.color} />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-1 font-poppins">{action.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{action.description}</p>
                </div>
                <ArrowRight size={20} className="text-gray-300 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300 mt-4" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
};
