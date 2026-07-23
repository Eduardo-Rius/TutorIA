import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { recuperarPassword } from '../services/authService';
import imssLogo from '../assets/imss_logo.svg';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email) {
      setError('Por favor ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);
    try {
      await recuperarPassword(email.trim());
      setSuccess('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.');
      setTimeout(() => {
        navigate('/');
      }, 5000);
    } catch (err) {
      setError('Error al solicitar la recuperación: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-imss-bg px-4 py-8">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-8 border-imss-gold animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-8">
          <img src={imssLogo} alt="IMSS Logo" className="w-40" />
        </div>
        
        <h1 className="text-2xl font-bold text-imss-green-dark mb-2 text-center">Recuperar Contraseña</h1>
        <p className="text-gray-500 text-center mb-8 text-sm">
          Ingresa el correo electrónico institucional con el que te registraste.
        </p>
        
        <form onSubmit={handleReset} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Correo Electrónico</label>
            <input 
              type="email" 
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-imss-green-dark outline-none transition-all text-gray-900"
              placeholder="ejemplo@imss.gob.mx"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100 animate-in fade-in">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-imss-green-dark p-3 rounded-lg text-sm text-center border border-green-200 font-bold animate-in fade-in">
              {success}
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit"
              disabled={loading}
              className={`w-full py-3 bg-imss-green-dark text-white font-bold rounded-lg hover:bg-imss-green-medium transition-colors shadow-lg flex justify-center items-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enviando...
                </>
              ) : 'Enviar Enlace'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center border-t border-gray-100 pt-6">
          <Link to="/" className="text-imss-green-dark hover:text-imss-green-medium font-bold text-sm">
            Volver al Inicio de Sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
