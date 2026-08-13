import { Assignment, InstitutionalRole } from '../assignment/Assignment';

export interface AuthorizationContextProps {
  authUid: string;
  personId: string;
  assignmentId: string;
  daycareId: string;
  institutionalRole: InstitutionalRole;
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
  public get daycareId(): string { return this.props.daycareId; }
  public get institutionalRole(): InstitutionalRole { return this.props.institutionalRole; }
  public get roomIds(): string[] { return [...this.props.roomIds]; }
  public get active(): boolean { return this.props.active; }
  public get validFrom(): Date { return this.props.validFrom; }
  public get validTo(): Date | null { return this.props.validTo; }

  public static fromAssignment(assignment: Assignment): AuthorizationContext {
    return new AuthorizationContext({
      authUid: assignment.authUid,
      personId: assignment.personId,
      assignmentId: assignment.id,
      daycareId: assignment.daycareId,
      institutionalRole: assignment.institutionalRole,
      roomIds: [...assignment.roomIds],
      active: assignment.status === 'ACTIVE',
      validFrom: assignment.validFrom,
      validTo: assignment.validTo,
    });
  }

  public static reconstitute(props: AuthorizationContextProps): AuthorizationContext {
    return new AuthorizationContext({
      ...props,
      roomIds: [...props.roomIds],
    });
  }
}
