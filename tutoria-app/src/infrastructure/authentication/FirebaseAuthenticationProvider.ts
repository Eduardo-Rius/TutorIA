import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { AuthenticationProvider } from '../../application/ports/AuthenticationProvider';

export class FirebaseAuthenticationProvider implements AuthenticationProvider {
  private authInstance?: any;

  constructor(authInstance?: any) {
    this.authInstance = authInstance;
  }

  private async getAuth(): Promise<any> {
    if (!this.authInstance) {
      const { auth } = await import('../firebase/firebaseConfig');
      this.authInstance = auth;
    }
    return this.authInstance;
  }

  async login(email: string, password: string): Promise<void> {
    const auth = await this.getAuth();
    await signInWithEmailAndPassword(auth, email, password);
  }

  async logout(): Promise<void> {
    const auth = await this.getAuth();
    await signOut(auth);
  }

  async restoreSession(): Promise<string | null> {
    const auth = await this.getAuth();
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user: any) => {
        unsubscribe();
        resolve(user?.uid || null);
      });
    });
  }

  getCurrentUser(): string | null {
    return this.authInstance?.currentUser?.uid || null;
  }

  getCurrentUserEmail(): string | null {
    return this.authInstance?.currentUser?.email || null;
  }
}
