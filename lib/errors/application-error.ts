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

  // Inspect only to classify; never expose SQL, bound values or raw messages.
  if (error instanceof Error && error.message.startsWith("D1_ERROR:")) {
    const messages = [error.message, error.cause instanceof Error ? error.cause.message : ""].join(" ");
    const missingSchema = /no such (?:table|column)|has no column named/i.test(messages);
    return new ApplicationError(
      missingSchema ? "DATABASE_SCHEMA_MISSING" : "DATABASE_ERROR",
      503,
      missingSchema ? "Kho dữ liệu chưa được cập nhật. Vui lòng liên hệ quản trị viên." : "Kho dữ liệu tạm thời không khả dụng. Hãy thử lại sau.",
      !missingSchema,
      { cause: error },
    );
  }

  return new ApplicationError(
    "INTERNAL_ERROR",
    500,
    "Bếp AI đang gặp sự cố. Hãy thử lại sau.",
    true,
    { cause: error },
  );
}
