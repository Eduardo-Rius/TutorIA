export interface ContextRequirement {
  readonly id: string;
  readonly axis: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly isRequired: boolean;
}
