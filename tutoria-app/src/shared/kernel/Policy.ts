export interface Policy<T> {
  evaluate(context: T): boolean;
}
