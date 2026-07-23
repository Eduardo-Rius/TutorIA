import { Navigate, Outlet } from 'react-router-dom';
import { logoutUsuario } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-imss-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-imss-green-dark"></div>
          <p className="text-imss-green-dark font-bold animate-pulse">Verificando credenciales institucionales...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Si el usuario está autenticado pero no tiene perfil en Firestore
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-imss-bg p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center border-t-8 border-imss-burgundy">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-imss-burgundy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Acceso Restringido</h2>
          <p className="text-gray-600 mb-8">
            Usuario autenticado, pero no tiene perfil institucional asignado. 
            <span className="block mt-2 font-bold text-imss-green-dark">Contacte al administrador.</span>
          </p>
          <button 
            onClick={logoutUsuario}
            className="w-full py-3 px-4 bg-imss-green-dark text-white rounded-lg font-bold hover:bg-imss-green-medium transition shadow-lg"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile?.rol) && !allowedRoles.includes(profile?.rolApp)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
