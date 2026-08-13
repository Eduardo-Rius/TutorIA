import { AuthorizationContext } from '../../domain/identity/authorization/AuthorizationContext';

export interface AuthorizationContextRepository {
  findByAuthUid(authUid: string): Promise<AuthorizationContext | null>;
  save(context: AuthorizationContext): Promise<void>;
  deleteByAuthUid(authUid: string): Promise<void>;
}
