export class Result<TValue = void, TError = string> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  public readonly error: TError | null;
  private readonly _value: TValue | null;

  private constructor(isSuccess: boolean, error?: TError | null, value?: TValue) {
    if (isSuccess && error !== undefined && error !== null) {
      throw new Error("InvalidOperation: A result cannot be successful and contain an error");
    }
    if (!isSuccess && (error === undefined || error === null)) {
      throw new Error("InvalidOperation: A failing result needs to contain an error");
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error ?? null;
    this._value = value !== undefined ? value : null;
  }

  public getValue(): TValue {
    if (!this.isSuccess) {
      throw new Error("Can't get the value of an error result. Use 'error' instead.");
    }
    // _value could be false, 0, "", so we just return it as TValue.
    // If it was instantiated as undefined but TValue allows it, it returns null.
    // The cast is safe here because we guarantee isSuccess.
    return this._value as TValue;
  }

  public static ok<U = void>(value?: U): Result<U, never> {
    return new Result<U, never>(true, null, value);
  }

  public static fail<U = void, E = string>(error: E): Result<U, E> {
    return new Result<U, E>(false, error);
  }
}
