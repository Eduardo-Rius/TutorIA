export type SessionStatus = 'UNKNOWN' | 'RESTORING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'ERROR';

export interface Session {
  status: SessionStatus;
  userId?: string;
  error?: string;
}
