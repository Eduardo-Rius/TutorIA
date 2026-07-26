export interface Factory<T> {
  create(...args: any[]): T;
}
