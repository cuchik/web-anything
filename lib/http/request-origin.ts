import { getAppOrigin, getServerConfig } from "@/lib/config/server";
import { ApplicationError } from "@/lib/errors/application-error";

export function isSecureRequest(request: Request) {
  return getServerConfig().NODE_ENV === "production" || new URL(request.url).protocol === "https:";
}

/** Never derive email links or metadata from Host or forwarded headers. */
export function resolveAppOrigin(_request?: Request) {
  void _request; // Kept for existing callers; never trusted for origin resolution.
  return getAppOrigin();
}

export function assertSameOrigin(request: Request) {
  const expected = getAppOrigin();
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (origin !== expected || (site !== null && site !== "same-origin")) {
    throw new ApplicationError("CROSS_ORIGIN_BLOCKED", 403, "Yêu cầu không đến từ trang này.");
  }
}
