import { NextResponse } from "next/server";
import { ApplicationError, toApplicationError } from "@/lib/errors/application-error";

export function noStoreJson(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

export function apiErrorResponse(error: unknown) {
  const applicationError = toApplicationError(error);
  return noStoreJson(
    { error: { code: applicationError.code, message: applicationError.publicMessage } },
    applicationError.status,
  );
}

export async function readJsonBody(request: Request, maxBytes = 4_096): Promise<unknown> {
  const tooLarge = () => new ApplicationError("REQUEST_TOO_LARGE", 413, "Dữ liệu gửi lên quá lớn.");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw new ApplicationError("INVALID_JSON", 400, "Dữ liệu gửi lên không đúng định dạng.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ApplicationError("REQUEST_TIMEOUT", 408, "Gửi dữ liệu quá lâu. Hãy thử lại."));
      void reader.cancel().catch(() => undefined);
    }, 10_000);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw tooLarge();
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    void reader.cancel().catch(() => undefined);
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError(
      "INVALID_JSON",
      400,
      "Dữ liệu gửi lên không đúng định dạng.",
      false,
      { cause: error },
    );
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
