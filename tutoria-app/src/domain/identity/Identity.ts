export interface Identity {
  id: string; // The authentication ID (e.g. Firebase UID)
  email: string;
  name?: string;
}
