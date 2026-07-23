import { useSessionTimeout } from '../../hooks/useSessionTimeout';

const SessionWarningModal = () => {
  const { showWarning, resetTimer, handleLogout } = useSessionTimeout();

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-fade-in-up border-t-8 border-yellow-500">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Aviso de Inactividad</h2>
        <p className="text-gray-600 text-center mb-8">
          Tu sesión está a punto de cerrarse por inactividad. ¿Deseas continuar trabajando?
        </p>
        <div className="flex gap-4">
          <button 
            onClick={handleLogout}
            className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
          >
            Cerrar Sesión
          </button>
          <button 
            onClick={resetTimer}
            className="flex-1 py-3 px-4 bg-imss-green-dark text-white rounded-lg font-bold hover:bg-imss-green-medium transition shadow-lg"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;
