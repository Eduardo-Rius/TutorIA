/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { normalizeGuarderiasSupervisadas } from '../utils/normalizeData';
import { onAuthStateChanged } from 'firebase/auth';
import { getUsuario, updateUltimoAcceso, createOrUpdateUsuario } from '../services/usuariosService';
import { getPersonalByEmail } from '../services/personalService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Buscar perfil en Firestore usando el nuevo servicio
        try {
          const userProfile = await getUsuario(currentUser.uid);
          
          if (userProfile) {
            // Verificar si el usuario sigue en personalAutorizado y está activo
            const personalData = await getPersonalByEmail(userProfile.email);
            if (personalData && personalData.activo === true) {
              setProfile({
                ...userProfile,
                uid: userProfile.uid || userProfile.id || currentUser.uid,
                id: userProfile.id || currentUser.uid,
                rol: userProfile.rol || userProfile.rolApp || 'docente',
                rolApp: userProfile.rolApp || userProfile.rol || 'docente',
                guarderiaCodigo: userProfile.numeroGuarderia || userProfile.guarderiaCodigo || userProfile.guarderiaId || '',
                guarderiaId: userProfile.numeroGuarderia || userProfile.guarderiaId || userProfile.guarderiaCodigo || '',
                guarderiaNombre: userProfile.nombreGuarderia || userProfile.guarderiaNombre || ''
              });
              // Actualizar el último acceso
              await updateUltimoAcceso(currentUser.uid);
            } else {
              console.warn(`Usuario ${userProfile.email} no está autorizado o activo en personalAutorizado.`);
              setProfile(null);
            }
          } else {
            // Si el perfil de Firestore no existe, verificar si está en personalAutorizado para recrearlo
            const personalData = await getPersonalByEmail(currentUser.email);
            if (personalData && personalData.activo === true) {
              console.log(`Recreando perfil de Firestore para usuario de reingreso: ${currentUser.email}`);
              
              const getRolApp = (cargo, cargoEspecifico) => {
                const c = (cargo || '').toLowerCase();
                const ce = (cargoEspecifico || '').toLowerCase();
                if (c.includes('supervisor regional')) return 'supervisor';
                if (c.includes('directora')) return 'directora';
                if (c.includes('administrador') || c.includes('admin')) return 'admin';
                if (c.includes('pedagoga') || c.includes('educadora') || c.includes('asistente educativa') || ce.includes('educadora')) return 'docente';
                return 'pendiente';
              };
              
              const isSupervisor = (personalData.cargo || '').toLowerCase().includes('supervisor regional');
              let guarderiasArr = [];
              if (isSupervisor) {
                guarderiasArr = normalizeGuarderiasSupervisadas(personalData.guarderiasSupervisadas);
              }
              const rol = getRolApp(personalData.cargo, personalData.cargoEspecifico);
              
              await createOrUpdateUsuario(currentUser.uid, {
                email: currentUser.email.toLowerCase().trim(),
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
              }, true);
              
              const newProfile = await getUsuario(currentUser.uid);
              if (newProfile) {
                setProfile({
                  ...newProfile,
                  uid: newProfile.uid || newProfile.id || currentUser.uid,
                  id: newProfile.id || currentUser.uid,
                  rol: newProfile.rol || newProfile.rolApp || 'docente',
                  rolApp: newProfile.rolApp || newProfile.rol || 'docente',
                  guarderiaCodigo: newProfile.numeroGuarderia || newProfile.guarderiaCodigo || newProfile.guarderiaId || '',
                  guarderiaId: newProfile.numeroGuarderia || newProfile.guarderiaId || newProfile.guarderiaCodigo || '',
                  guarderiaNombre: newProfile.nombreGuarderia || newProfile.guarderiaNombre || ''
                });
              } else {
                setProfile(null);
              }
            } else {
              setProfile(null);
            }
          }
        } catch (error) {
          console.error("Error al gestionar perfil de usuario:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
