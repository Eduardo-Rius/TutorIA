export interface ContextFragment {
  readonly id: string;
  readonly type: string;
  readonly source: string;
  readonly content: string;
  readonly relevance: number;
  readonly validFrom?: Date;
  readonly validUntil?: Date;
  readonly metadata: Readonly<Record<string, unknown>>;
}
