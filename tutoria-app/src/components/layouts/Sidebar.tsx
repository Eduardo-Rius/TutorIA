import React from 'react';
import { Home, NotebookPen, Lightbulb, Library, BookOpen, LineChart, Users, Settings, ChevronDown } from 'lucide-react';
import robotLogo from '../../assets/brand/logos/imagotype/TutorIA_Imagotype_Transparent.png';

import { useNavigate, useLocation } from 'react-router-dom';
import { PresencePolicy } from '../../presentation/experience/presence/PresencePolicy';
import { ANITA_ID } from '../../presentation/experience/characters/CharacterDefinitionCatalog';
import { InstitutionalPresenceRenderer } from '../../presentation/experience/presence/InstitutionalPresenceRenderer';
interface SidebarItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const ITEMS: SidebarItem[] = [
  { icon: Home, label: 'Mi espacio', path: '/workspace' },
  { icon: NotebookPen, label: 'Planeaciones', path: '/workspace/planning' },
  { icon: Lightbulb, label: 'Experiencias', path: '/workspace/experiences' },
  { icon: Library, label: 'Conocimiento', path: '/workspace/knowledge' },
  { icon: BookOpen, label: 'Lineamientos', path: '/workspace/guidelines' },
  { icon: LineChart, label: 'Analítica', path: '/workspace/analytics' },
  { icon: Users, label: 'Comunidad', path: '/workspace/community' },
  { icon: Settings, label: 'Configuración', path: '/workspace/settings' },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const resolution = PresencePolicy.resolve({
    institutionalRole: 'Docente Maternal',
    workspaceState: 'PENDING_WORK',
    experienceState: 'NEUTRAL',
    scene: 'default',
    allowedCharacters: [ANITA_ID],
    reducedMotionPreference: false,
    requireAvailableAssets: true
  });

  return (
    <div className="flex flex-col h-full w-[280px] bg-brandDark shadow-lg overflow-y-auto">
      {/* Header (Logo) */}
      <div className="flex flex-col items-center justify-center pt-8 pb-6">
        <img src={robotLogo} alt="Robot TutorIA" className="h-16 w-auto mb-2 object-contain" />
        <h2 className="text-white text-2xl font-poppins font-bold tracking-tight">
          Tutor<span className="text-brandPrimary">IA</span>
        </h2>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        {ITEMS.map((item, idx) => {
          const isActive = location.pathname === item.path || (item.path !== '/workspace' && location.pathname.startsWith(item.path));

          return (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-[8px] transition-all duration-300 ${
                isActive
                  ? 'bg-brandPrimary text-white shadow-soft'
                  : 'text-textLight hover:bg-navHover hover:text-white'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-white' : ''} />
              <span className={`text-[15px] font-inter ${isActive ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Perfil (Inferior) */}
      <div className="p-4 mt-auto">
        <button className="w-full flex items-center gap-3.5 p-3 rounded-[12px] hover:bg-white/5 transition-all duration-300 text-left group border border-transparent hover:border-white/5">
          <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border-2 border-white/10 shadow-sm relative">
            <InstitutionalPresenceRenderer resolution={resolution} className="w-full h-full object-cover scale-110 translate-y-1" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-[15px] font-semibold text-white truncate font-poppins tracking-tight leading-tight">Docente</p>
            <p className="text-[13px] text-brandPrimary truncate font-inter font-medium leading-tight mt-0.5">Maternal B</p>
          </div>
          <ChevronDown size={18} className="text-textLight group-hover:text-white transition-colors opacity-50 group-hover:opacity-100" />
        </button>
      </div>
    </div>
  );
};
