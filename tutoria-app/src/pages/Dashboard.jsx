import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getPlaneaciones } from '../services/planeacionService';
import { getAllGuarderias } from '../services/guarderiasService';
import { EN_REVISION, APROBADO, RECHAZADO } from '../constants/planeacionEstados';
import { 
  FilePlus, 
  Search, 
  History, 
  Building2, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Shield,
  Loader2,
  ChevronRight
} from 'lucide-react';
import imssLogo from '../assets/imss_logo.svg';

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [planeaciones, setPlaneaciones] = useState([]);
  const [guarderias, setGuarderias] = useState([]);
  const [stats, setStats] = useState({
    totalGuarderias: 0,
    totalPlaneaciones: 0,
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0
  });

  const fetchSupervisorData = useCallback(async () => {
    setLoading(true);
    try {
      const allPlanes = await getPlaneaciones(profile);
      const allGuarderias = await getAllGuarderias();
      
      setPlaneaciones(allPlanes || []);
      setGuarderias(allGuarderias || []);

      const supGList = profile.guarderiasSupervisadas || [];
      const totalG = supGList.length;
      
      const totalP = allPlanes.length;
      const pPendientes = allPlanes.filter(p => p.estado === EN_REVISION).length;
      const pAprobadas = allPlanes.filter(p => p.estado === APROBADO).length;
      const pRechazadas = allPlanes.filter(p => p.estado === RECHAZADO).length;

      setStats({
        totalGuarderias: totalG,
        totalPlaneaciones: totalP,
        pendientes: pPendientes,
        aprobadas: pAprobadas,
        rechazadas: pRechazadas
      });
    } catch (error) {
      console.error("Error al cargar datos de supervisor:", error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    let active = true;
    const execute = async () => {
      await Promise.resolve();
      if (active && profile?.rol === 'supervisor') {
        fetchSupervisorData();
      }
    };
    execute();
    return () => {
      active = false;
    };
  }, [profile, fetchSupervisorData]);

  // Tarjetas para roles Docente, Directora, Administrador
  const navigationCards = [
    {
      title: 'Crear Planeación',
      description: 'Inicia un nuevo formato pedagógico siguiendo la normativa vigente.',
      icon: <FilePlus className="text-imss-green-dark group-hover:!text-imss-gold transition-colors duration-300" size={32} />,
      path: '/planeacion',
      roles: ['docente', 'directora']
    },
    {
      title: 'Consultar Normativa',
      description: 'Accede rápidamente a los lineamientos y reglamentos de las Guarderías IMSS.',
      icon: <Search className="text-imss-green-dark group-hover:!text-imss-gold transition-colors duration-300" size={32} />,
      path: '/chat'
    },
    {
      title: 'Ver Planeaciones',
      description: 'Revisa el historial de planeaciones creadas y sus estados de aprobación.',
      icon: <History className="text-imss-green-dark group-hover:!text-imss-gold transition-colors duration-300" size={32} />,
      path: '/planeaciones',
      roles: ['docente', 'directora', 'supervisor', 'admin']
    }
  ].filter(card => !card.roles || card.roles.includes(profile?.rol));

  // Render para Supervisor Regional
  if (profile?.rol === 'supervisor') {
    const supervisedCodes = (profile.guarderiasSupervisadas || []).map(code => String(code).trim());
    
    const statsByGuarderia = supervisedCodes.map(code => {
      const gInfo = guarderias.find(g => String(g.id) === code || String(g.numeroGuarderia) === code);
      const nombre = gInfo ? (gInfo.nombreGuarderia || gInfo.nombre) : `Guardería ${code}`;
      
      const planesG = planeaciones.filter(p => String(p.guarderiaCodigo) === code || String(p.guarderiaId) === code);
      const pendientes = planesG.filter(p => p.estado === EN_REVISION).length;
      const aprobadas = planesG.filter(p => p.estado === APROBADO).length;
      const rechazadas = planesG.filter(p => p.estado === RECHAZADO).length;
      const total = planesG.length;

      return {
        code,
        nombre,
        pendientes,
        aprobadas,
        rechazadas,
        total
      };
    });

    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-gray-50 pb-20">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-imss-gold font-bold text-xs uppercase tracking-widest mb-1">
              <Shield size={16} /> Supervisor Regional
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-imss-green-dark">
              Panel de Supervisión Pedagógica
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Zona de supervisión asignada: <span className="font-bold text-gray-700">{profile.zonaSupervision || 'Nacional'}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchSupervisorData}
              disabled={loading}
              className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition disabled:opacity-50"
              title="Recargar Datos"
            >
              <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <img src={imssLogo} alt="IMSS Logo" className="w-16 h-auto hidden md:block" />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Loader2 className="animate-spin text-imss-green-dark mb-4" size={48} />
            <p className="text-gray-500 font-medium">Consolidando métricas regionales...</p>
          </div>
        ) : (
          <>
            {/* Grid de KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">Guarderías</div>
                <div className="flex justify-between items-end mt-2">
                  <div className="text-2xl font-black text-gray-800">{stats.totalGuarderias}</div>
                  <Building2 className="text-gray-300 w-8 h-8 mb-1" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">Total Planeaciones</div>
                <div className="flex justify-between items-end mt-2">
                  <div className="text-2xl font-black text-gray-800">{stats.totalPlaneaciones}</div>
                  <FileText className="text-gray-300 w-8 h-8 mb-1" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between border-l-4 border-l-imss-gold">
                <div className="text-imss-gold font-bold text-[10px] uppercase tracking-wider">Pendientes</div>
                <div className="flex justify-between items-end mt-2">
                  <div className="text-2xl font-black text-imss-gold">{stats.pendientes}</div>
                  <Clock className="text-imss-gold/20 w-8 h-8 mb-1" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between border-l-4 border-l-green-600">
                <div className="text-green-600 font-bold text-[10px] uppercase tracking-wider">Aprobadas</div>
                <div className="flex justify-between items-end mt-2">
                  <div className="text-2xl font-black text-green-600">{stats.aprobadas}</div>
                  <CheckCircle2 className="text-green-600/20 w-8 h-8 mb-1" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between border-l-4 border-l-red-600 col-span-2 lg:col-span-1">
                <div className="text-red-600 font-bold text-[10px] uppercase tracking-wider">Rechazadas</div>
                <div className="flex justify-between items-end mt-2">
                  <div className="text-2xl font-black text-red-600">{stats.rechazadas}</div>
                  <AlertCircle className="text-red-600/20 w-8 h-8 mb-1" />
                </div>
              </div>
            </div>

            {/* Listado Detallado por Guardería */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-bold text-imss-green-dark">Guarderías Asignadas</h3>
                  <p className="text-xs text-gray-400">Detalle de planeaciones y estado de avance por establecimiento.</p>
                </div>
                <button 
                  onClick={() => navigate('/planeaciones')}
                  className="px-4 py-2 bg-imss-green-dark/10 text-imss-green-dark hover:bg-imss-green-dark hover:text-white rounded-xl transition text-xs font-bold flex items-center gap-1"
                >
                  Ver Todas las Planeaciones <ChevronRight size={14} />
                </button>
              </div>

              {statsByGuarderia.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Building2 size={40} className="mx-auto mb-4 text-gray-300 animate-pulse" />
                  <p className="font-bold">No tienes guarderías asignadas en tu perfil.</p>
                  <p className="text-xs mt-1 text-gray-400">Solicita la asignación de códigos de guardería a administración central.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <th className="py-4 px-6">Código</th>
                        <th className="py-4 px-6">Nombre de Guardería</th>
                        <th className="py-4 px-6 text-center">Pendientes</th>
                        <th className="py-4 px-6 text-center">Aprobadas</th>
                        <th className="py-4 px-6 text-center">Rechazadas</th>
                        <th className="py-4 px-6 text-center">Total</th>
                        <th className="py-4 px-6 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {statsByGuarderia.map((g) => (
                        <tr key={g.code} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-6 font-mono font-bold text-imss-gold">{g.code}</td>
                          <td className="py-4 px-6 font-bold text-gray-800">{g.nombre}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${g.pendientes > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                              {g.pendientes}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${g.aprobadas > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {g.aprobadas}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${g.rechazadas > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                              {g.rechazadas}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center font-bold text-gray-700">{g.total}</td>
                          <td className="py-4 px-6 text-right">
                            <button 
                              onClick={() => navigate('/planeaciones', { state: { guarderiaCodigo: g.code } })}
                              className="text-xs text-imss-green-dark hover:underline font-bold"
                            >
                              Ver Planeaciones
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Render para otros roles
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">¡Bienvenid@, {profile?.nombre || 'Usuario'}!</h1>
        <p className="text-gray-600 mt-2">Selecciona una acción para comenzar tu jornada pedagógica.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {navigationCards.map((card, index) => (
          <div 
            key={index}
            onClick={() => navigate(card.path)}
            className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
          >
            <div className="bg-imss-bg w-16 h-16 rounded-lg flex items-center justify-center mb-6 group-hover:bg-imss-green-dark group-hover:text-white transition-colors">
              {card.icon}
            </div>
            <h2 className="text-xl font-bold text-imss-green-dark mb-3">{card.title}</h2>
            <p className="text-gray-600 leading-relaxed">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
