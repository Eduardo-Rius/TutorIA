import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPersonalByEmail } from '../services/personalService';
import { registrarUsuario } from '../services/authService';
import { createOrUpdateUsuario } from '../services/usuariosService';
import { normalizeGuarderiasSupervisadas } from '../utils/normalizeData';
import { auth } from '../services/firebase';
import { signOut, deleteUser, updateProfile } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import imssLogo from '../assets/imss_logo.svg';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[%#$@!&*]).{8,}$/;

  const getRolApp = (cargo, cargoEspecifico) => {
    const c = (cargo || '').toLowerCase();
    const ce = (cargoEspecifico || '').toLowerCase();
    
    if (c.includes('supervisor regional')) return 'supervisor';
    if (c.includes('directora')) return 'directora';
    if (c.includes('administrador') || c.includes('admin')) return 'admin';
    if (c.includes('pedagoga') || c.includes('educadora') || c.includes('asistente educativa') || ce.includes('educadora')) return 'docente';
    
    return 'pendiente';
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password || !confirmPassword) {
      setError('Por favor llena todos los campos.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    
    if (!passwordRegex.test(password)) {
      setError('La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial (%, #, $, @, !, &, *).');
      return;
    }

    setLoading(true);
    let createdUser = null;
    try {
      const emailLower = email.toLowerCase().trim();
      
      // 1. Crear el usuario en Firebase Auth primero
      // Esto inicia sesión automáticamente al usuario en el cliente, permitiendo consultas autenticadas
      const { user } = await registrarUsuario(emailLower, password, 'Registro en Proceso');
      createdUser = user;

      // 2. Ahora que el cliente está autenticado, verificar si existe en personalAutorizado y está activo
      const personalData = await getPersonalByEmail(emailLower);
      
      if (!personalData) {
        setError('Tu correo no se encuentra registrado como personal autorizado. Contacta a la administración de tu guardería.');
        if (createdUser) {
          await deleteUser(createdUser);
          createdUser = null;
        }
        setLoading(false);
        return;
      }
      
      if (personalData.activo !== true) {
        setError('Tu cuenta no está activa. Contacta a la administración.');
        if (createdUser) {
          await deleteUser(createdUser);
          createdUser = null;
        }
        setLoading(false);
        return;
      }

      const cargoLower = (personalData.cargo || '').toLowerCase();
      const isSupervisor = cargoLower.includes('supervisor regional');

      if (!isSupervisor && !personalData.numeroGuarderia) {
        setError('No tienes una guardería asignada en el sistema. Contacta a administración.');
        if (createdUser) {
          await deleteUser(createdUser);
          createdUser = null;
        }
        setLoading(false);
        return;
      }

      // Actualizar el perfil en Firebase Auth con el nombre oficial
      const nombreCompleto = `${personalData.nombre} ${personalData.apellidos}`;
      await updateProfile(user, { displayName: nombreCompleto });

      // Preparar guarderiasSupervisadas si es supervisor
      let guarderiasArr = [];
      if (isSupervisor) {
        guarderiasArr = normalizeGuarderiasSupervisadas(personalData.guarderiasSupervisadas);
      }

      const rol = getRolApp(personalData.cargo, personalData.cargoEspecifico);

      // 3. Crear en Firestore usuarios/{uid}
      await createOrUpdateUsuario(user.uid, {
        email: emailLower,
        nombre: personalData.nombre,
        apellidos: personalData.apellidos,
        cargo: personalData.cargo,
        cargoEspecifico: personalData.cargoEspecifico,
        telefono: personalData.telefono,
        telefonoSupervisor: personalData.telefonoSupervisor,
        numeroGuarderia: isSupervisor ? null : personalData.numeroGuarderia,
        nombreGuarderia: isSupervisor ? null : personalData.nombreGuarderia,
        tipoGuarderia: isSupervisor ? null : personalData.tipoGuarderia,
        zonaSupervision: isSupervisor ? personalData.zonaSupervision : null,
        guarderiasSupervisadas: guarderiasArr,
        rolApp: rol,
        activo: true,
        creadoEn: new Date().toISOString()
      });

      await signOut(auth);
      setSuccess('Cuenta creada correctamente. Ahora puedes iniciar sesión.');
      
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      // Limpiar cuenta de Auth si hubo un error posterior a su creación
      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch (cleanupErr) {
          console.error("Error al limpiar usuario tras fallo de registro:", cleanupErr);
        }
      }

      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya tiene una cuenta registrada en el sistema de autenticación. Si eres personal de reingreso, inicia sesión directamente o usa la opción "¿Olvidaste tu contraseña?" para cambiarla.');
      } else {
        setError('Error al crear cuenta: ' + err.message);
      }
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
        
        <h1 className="text-2xl font-bold text-imss-green-dark mb-2 text-center">Registro Institucional</h1>
        <p className="text-gray-500 text-center mb-8 text-sm uppercase tracking-widest font-medium">Personal Autorizado IMSS</p>
        
        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Correo Electrónico Oficial</label>
            <input 
              type="email" 
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-imss-green-dark outline-none transition-all text-gray-900"
              placeholder="ejemplo@imss.gob.mx"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs border border-blue-100">
            <p className="font-bold mb-1">La contraseña debe tener:</p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>mínimo 8 caracteres</li>
              <li>al menos una letra mayúscula</li>
              <li>al menos una letra minúscula</li>
              <li>al menos un número</li>
              <li>al menos un carácter especial como %, #, $, @, !, &, *</li>
            </ul>
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
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Confirmar Contraseña</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                className="w-full p-3 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-imss-green-dark outline-none transition-all text-gray-900"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
                  Procesando Registro...
                </>
              ) : 'Validar y Crear Cuenta'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <Link to="/" className="text-imss-green-dark hover:text-imss-green-medium font-bold text-sm">
            ¿Ya tienes cuenta? Inicia Sesión aquí
          </Link>
          <p className="text-[10px] text-gray-400 uppercase tracking-tighter mt-4">
            Sistema con validación cruzada. <br/>
            Contacta a tu directora para autorización.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
