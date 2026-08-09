import { personas } from '../../theme/personas';
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
        <img src={robotLogo} alt="Robot TutorIA" className="h-32 w-auto mb-1 object-contain" />
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
      <div className="p-6 mt-auto border-t border-white/5 pt-8">
        <button className="w-full flex flex-col items-center justify-center gap-4 p-5 rounded-2xl hover:bg-white/5 transition-all duration-300 group border border-transparent hover:border-white/10 shadow-sm">
          <div className="w-[104px] h-[104px] shrink-0 flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300">
            <img src={personas.anita} alt="Anita" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-lg font-bold text-white font-poppins tracking-tight leading-tight mb-1">Anita</p>
            <p className="text-sm text-brandPrimary font-inter font-medium leading-tight mb-1">Pedagoga</p>
            <p className="text-xs text-textLight font-inter font-medium leading-tight">Lactantes C</p>
          </div>
        </button>
      </div>
    </div>
  );
};
