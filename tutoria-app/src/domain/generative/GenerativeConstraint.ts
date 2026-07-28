export interface GenerativeConstraint {
  readonly type: 'MaxLength' | 'Language' | 'Format' | 'Tone' | 'PedagogicalStructure' | string;
  readonly value: string;
  readonly isStrict: boolean;
}
