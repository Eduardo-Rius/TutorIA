export type InstitutionalRole = 'TEACHER' | 'DIRECTOR' | 'SUPERVISOR';
export type AssignmentStatus = 'ACTIVE' | 'INACTIVE';

export interface AssignmentProps {
  id: string; // UUID
  personId: string;
  daycareId: string;
  corporateEmail: string;
  authUid: string;
  institutionalRole: InstitutionalRole;
  roomIds: string[];
  validFrom: Date;
  validTo: Date | null;
  status: AssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Assignment {
  private constructor(public readonly props: AssignmentProps) {}

  public get id(): string { return this.props.id; }
  public get personId(): string { return this.props.personId; }
  public get daycareId(): string { return this.props.daycareId; }
  public get corporateEmail(): string { return this.props.corporateEmail; }
  public get authUid(): string { return this.props.authUid; }
  public get institutionalRole(): InstitutionalRole { return this.props.institutionalRole; }
  public get roomIds(): string[] { return [...this.props.roomIds]; }
  public get validFrom(): Date { return this.props.validFrom; }
  public get validTo(): Date | null { return this.props.validTo; }
  public get status(): AssignmentStatus { return this.props.status; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }

  public static create(props: {
    personId: string;
    daycareId: string;
    corporateEmail: string;
    authUid: string;
    institutionalRole: InstitutionalRole;
    roomIds: string[];
    validFrom: Date;
  }): Assignment {
    const validRoles = ['TEACHER', 'DIRECTOR', 'SUPERVISOR'];
    if (!validRoles.includes(props.institutionalRole)) {
      throw new Error(`Unsupported institutional role: ${props.institutionalRole}`);
    }

    return new Assignment({
      id: crypto.randomUUID(),
      personId: props.personId,
      daycareId: props.daycareId,
      corporateEmail: props.corporateEmail.trim().toLowerCase(),
      authUid: props.authUid,
      institutionalRole: props.institutionalRole,
      roomIds: [...props.roomIds],
      validFrom: props.validFrom,
      validTo: null,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  public static reconstitute(props: AssignmentProps): Assignment {
    return new Assignment({
      ...props,
      roomIds: [...props.roomIds],
    });
  }

  public deactivate(validTo: Date): void {
    if (this.props.status === 'INACTIVE') {
      throw new Error('Assignment is already inactive.');
    }
    if (validTo.getTime() < this.props.validFrom.getTime()) {
      throw new Error('validTo cannot be earlier than validFrom.');
    }

    this.props.status = 'INACTIVE';
    this.props.validTo = validTo;
    this.props.updatedAt = new Date();
  }
}
