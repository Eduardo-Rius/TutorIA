import { ProvisionModality, ProvisionModalityType } from './value-objects/ProvisionModality';
export interface DaycareImportMetadata {
  sourceFile: string;
  sourceVersion: string;
  importedAt: string; // ISO date string
  recordHash: string;
}

export interface DaycareProps {
  id: string; // TutorIA canonical identity (UUID)
  daycareNumber: string; // The COMPLETE official IMSS number (e.g., 'G-0001'). NON-UNIQUE searchable alias.
  daycareName: string;
  type?: string | null;
  state?: string | null;
  locality?: string | null;
  municipality?: string | null;
  street?: string | null;
  neighborhood?: string | null;
  exteriorNumber?: string | null;
  postalCode?: string | null;
  schedule?: string | null;
  supervisionZone?: string | null;
  supervisedDaycares?: string | null;
  supervisorPhone?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  active: boolean;
  modality?: ProvisionModalityType | null;
  metadata?: DaycareImportMetadata;
}

export class Daycare {
  private constructor(public readonly props: DaycareProps) {}

  public get daycareId(): string {
    return this.props.id;
  }

  public get daycareNumber(): string {
    return this.props.daycareNumber;
  }

  public get active(): boolean {
    return this.props.active;
  }

  public get modality(): ProvisionModality | undefined {
    if (!this.props.modality) return undefined;
    const result = ProvisionModality.create(this.props.modality);
    return result.isSuccess ? result.getValue() : undefined;
  }


  public get recordHash(): string | undefined {
    return this.props.metadata?.recordHash;
  }

  public static create(props: Omit<DaycareProps, 'metadata' | 'id'>, metadata: DaycareImportMetadata): Daycare {
    const normalizedProps = Daycare.normalize(props);
    return new Daycare({
      id: crypto.randomUUID(), // TutorIA-generated opaque UUID
      ...normalizedProps,
      metadata
    });
  }

    public static reconstitute(props: DaycareProps): Daycare {
    if (props.modality) {
      const result = ProvisionModality.create(props.modality);
      if (result.isFailure) {
        throw new Error(`Invalid provision modality in persisted data: ${props.modality}`);
      }
    }
    return new Daycare(props);
  }

  private static normalize(props: Omit<DaycareProps, 'metadata' | 'id'>): Omit<DaycareProps, 'metadata' | 'id'> {
    const cleanStr = (val: string | null | undefined): string | null => {
      if (val === undefined || val === null) return null;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    };

    const cleanNum = (val: number | null | undefined): number | null => {
      if (val === undefined || val === null || isNaN(val)) return null;
      return val;
    };

    const cleanModality = (val: string | null | undefined): ProvisionModalityType | null => {
      if (!val) return null;
      const result = ProvisionModality.create(val);
      if (result.isFailure) {
        throw new Error(`Invalid provision modality: ${val}`);
      }
      return result.getValue().value;
    };

    return {
      daycareNumber: props.daycareNumber.trim(), // Keep exact prefix, do not parse as int
      daycareName: cleanStr(props.daycareName) || '',
      type: cleanStr(props.type),
      state: cleanStr(props.state),
      locality: cleanStr(props.locality),
      municipality: cleanStr(props.municipality),
      street: cleanStr(props.street),
      neighborhood: cleanStr(props.neighborhood),
      exteriorNumber: cleanStr(props.exteriorNumber),
      postalCode: cleanStr(props.postalCode),
      schedule: cleanStr(props.schedule),
      supervisionZone: cleanStr(props.supervisionZone),
      supervisedDaycares: cleanStr(props.supervisedDaycares),
      supervisorPhone: cleanStr(props.supervisorPhone),
      phone: cleanStr(props.phone),
      latitude: cleanNum(props.latitude),
      longitude: cleanNum(props.longitude),
      active: props.active,
      modality: cleanModality(props.modality),
    };
  }
}
