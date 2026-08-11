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

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    throw new ApplicationError(
      "INVALID_JSON",
      400,
      "Dữ liệu gửi lên không đúng định dạng.",
      false,
      { cause: error },
    );
  }
}
