import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { AuthenticationProvider } from '../../application/ports/AuthenticationProvider';

export class FirebaseAuthenticationProvider implements AuthenticationProvider {
  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  restoreSession(): Promise<string | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user?.uid || null);
      });
    });
  }

  getCurrentUser(): string | null {
    return auth.currentUser?.uid || null;
  }
}
