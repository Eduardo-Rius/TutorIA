import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';

export const loginUsuario = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Error en login:", error);
    throw error;
  }
};

export const registrarUsuario = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Error en registro:", error);
    throw error;
  }
};

export const logoutUsuario = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Error en logout:", error);
    throw error;
  }
};

export const recuperarPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error("Error en recuperación de password:", error);
    throw error;
  }
};
