import { AuthorizationContext } from '../../domain/identity/authorization/AuthorizationContext';
import { AuthorizationContextRepository } from '../../application/ports/AuthorizationContextRepository';

export class InMemoryAuthorizationContextRepository implements AuthorizationContextRepository {
  private readonly store = new Map<string, AuthorizationContext>();

  public async findByAuthUid(authUid: string): Promise<AuthorizationContext | null> {
    const context = this.store.get(authUid);
    if (!context) {
      return null;
    }
    // Reconstitute to prevent external mutation
    return AuthorizationContext.reconstitute(context.props);
  }

  public async save(context: AuthorizationContext): Promise<void> {
    // 8. Exactly ONE current AuthorizationContext per authUid.
    // Saving another context for the same authUid replaces the previous projection.
    this.store.set(context.authUid, AuthorizationContext.reconstitute(context.props));
  }

  public async deleteByAuthUid(authUid: string): Promise<void> {
    this.store.delete(authUid);
  }
}
