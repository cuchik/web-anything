export class ApplicationError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly publicMessage: string,
    readonly retryable = false,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "ApplicationError";
  }
}

export function toApplicationError(error: unknown) {
  if (error instanceof ApplicationError) return error;

  return new ApplicationError(
    "INTERNAL_ERROR",
    500,
    "Bếp AI đang gặp sự cố. Hãy thử lại sau.",
    true,
    { cause: error },
  );
}
