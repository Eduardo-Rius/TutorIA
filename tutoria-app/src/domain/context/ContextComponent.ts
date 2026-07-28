export type ContextComponentType = string;

export interface ContextComponent<TValue = unknown> {
  readonly type: ContextComponentType;
  readonly value: TValue;
  readonly source: string;
  readonly capturedAt: Date;
}
