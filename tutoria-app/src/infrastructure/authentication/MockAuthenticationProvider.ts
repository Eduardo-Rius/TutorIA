import { AuthenticationProvider } from '../../application/ports/AuthenticationProvider';

export class MockAuthenticationProvider implements AuthenticationProvider {
  private readonly SESSION_KEY = 'tutoria_mock_session';

  async login(email: string, password: string): Promise<void> {
    // DEMO AUTHENTICATION ADAPTER
    if (email === 'ana@tutoria.mx' && password === 'password123') {
      localStorage.setItem(this.SESSION_KEY, 'user-ana-123');
      return;
    }
    // Accept any valid email format as per instructions
    if (email.includes('@') && password === 'password123') {
      localStorage.setItem(this.SESSION_KEY, 'user-demo-123');
      return;
    }
    throw new Error('Credenciales inválidas. Usa ana@tutoria.mx / password123');
  }

  async logout(): Promise<void> {
    localStorage.removeItem(this.SESSION_KEY);
  }

  async restoreSession(): Promise<string | null> {
    return localStorage.getItem(this.SESSION_KEY);
  }

  getCurrentUser(): string | null {
    return localStorage.getItem(this.SESSION_KEY);
  }
}
