export interface AuthenticationProvider {
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  restoreSession(): Promise<string | null>;
  getCurrentUser(): string | null;
}
