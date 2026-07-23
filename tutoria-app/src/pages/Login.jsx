import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getUsuario } from '../services/usuariosService';
import { getPersonalByEmail } from '../services/personalService';
import { Eye, EyeOff } from 'lucide-react';
import imssLogo from '../assets/imss_logo.svg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Verificar si el usuario sigue activo en Firestore
      const userProfile = await getUsuario(user.uid);
      
      if (!userProfile) {
        await signOut(auth);
        setError('No se encontró el perfil de tu cuenta. Contacta a administración.');
        setLoading(false);
        return;
      }

      if (userProfile.activo !== true) {
        await signOut(auth);
        setError('Tu cuenta ha sido desactivada. Contacta a la administración para reactivar el acceso.');
        setLoading(false);
        return;
      }

      // Verificar si el usuario sigue autorizado en el personal institucional
      const personalData = await getPersonalByEmail(email.trim());
      if (!personalData || personalData.activo !== true) {
        await signOut(auth);
        setError('Tu cuenta no está autorizada o ha sido desactivada del personal institucional. Contacta a administración.');
        setLoading(false);
        return;
      }

      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
      } else {
        setError('Error al iniciar sesión: ' + err.message);
      }
      console.error(err);
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
        
        <h1 className="text-2xl font-bold text-imss-green-dark mb-2 text-center">Plataforma Pedagógica</h1>
        <p className="text-gray-500 text-center mb-8 text-sm uppercase tracking-widest font-medium">Acceso Institucional</p>
        
        <form onSubmit={handleLogin} className="space-y-5">
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
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Contraseña</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                className="w-full p-3 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-imss-green-dark outline-none transition-all text-gray-900"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <Link to="/reset-password" className="text-xs text-imss-green-dark hover:text-imss-green-medium font-bold transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100 animate-in fade-in">
              {error}
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
                  Verificando...
                </>
              ) : 'Iniciar Sesión'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center border-t border-gray-100 pt-6">
          <Link 
            to="/register" 
            className="w-full inline-block py-3 px-4 bg-white border-2 border-imss-gold text-yellow-700 font-bold rounded-lg hover:bg-yellow-50 hover:shadow-md transition-all mb-6 text-sm"
          >
            Crear Cuenta Nueva
          </Link>
          <p className="text-[10px] text-gray-400 uppercase tracking-tighter">
            Uso exclusivo para personal de Guarderías IMSS. <br/>
            Este sistema monitorea el acceso no autorizado.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
