import { Assignment, InstitutionalRole } from '../assignment/Assignment';

export interface AuthorizationContextProps {
  authUid: string;
  personId: string;
  assignmentId: string;
  institutionalRole: InstitutionalRole;
  authorizedDaycareIds: string[];
  roomIds: string[];
  active: boolean;
  validFrom: Date;
  validTo: Date | null;
}

export class AuthorizationContext {
  private constructor(public readonly props: AuthorizationContextProps) {}

  public get authUid(): string { return this.props.authUid; }
  public get personId(): string { return this.props.personId; }
  public get assignmentId(): string { return this.props.assignmentId; }
  public get institutionalRole(): InstitutionalRole { return this.props.institutionalRole; }
  public get authorizedDaycareIds(): string[] { return [...this.props.authorizedDaycareIds]; }
  public get roomIds(): string[] { return [...this.props.roomIds]; }
  public get active(): boolean { return this.props.active; }
  public get validFrom(): Date { return this.props.validFrom; }
  public get validTo(): Date | null { return this.props.validTo; }

  private static validateAndNormalizeProps(props: AuthorizationContextProps): AuthorizationContextProps {
    let normalizedDaycares = Array.from(new Set(props.authorizedDaycareIds));

    if (props.active && normalizedDaycares.length === 0) {
      throw new Error('authorizedDaycareIds cannot be empty for an active context.');
    }

    if (normalizedDaycares.length > 1 && props.institutionalRole !== 'SUPERVISOR') {
      throw new Error('Only SUPERVISOR role can have an expanded multi-daycare scope.');
    }

    return {
      ...props,
      authorizedDaycareIds: normalizedDaycares,
      roomIds: [...props.roomIds],
    };
  }

  public static fromAssignment(assignment: Assignment, additionalDaycareIds: string[] = []): AuthorizationContext {
    return new AuthorizationContext(AuthorizationContext.validateAndNormalizeProps({
      authUid: assignment.authUid,
      personId: assignment.personId,
      assignmentId: assignment.id,
      institutionalRole: assignment.institutionalRole,
      authorizedDaycareIds: [assignment.daycareId, ...additionalDaycareIds],
      roomIds: [...assignment.roomIds],
      active: assignment.status === 'ACTIVE',
      validFrom: assignment.validFrom,
      validTo: assignment.validTo,
    }));
  }

  public static reconstitute(props: AuthorizationContextProps): AuthorizationContext {
    return new AuthorizationContext(AuthorizationContext.validateAndNormalizeProps(props));
  }
}
