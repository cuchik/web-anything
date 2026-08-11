import { ApplicationError } from "@/lib/errors/application-error";

function requestHost(request: Request) {
  return request.headers.get("host") ?? new URL(request.url).host;
}

export function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedProtocol) return forwardedProtocol === "https";
  return new URL(request.url).protocol === "https:";
}

/**
 * Prefers the configured origin because the Host header is client controlled and
 * would otherwise be reflected into emailed links.
 */
export function resolveAppOrigin(request: Request) {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      throw new ApplicationError(
        "INVALID_APP_URL",
        503,
        "Cấu hình APP_URL trên server không hợp lệ.",
      );
    }
  }

  const host = requestHost(request);
  return `${isSecureRequest(request) ? "https" : "http"}://${host}`;
}

/**
 * State-changing auth requests must originate from this site. Combined with
 * SameSite=Lax cookies this covers CSRF without a synchroniser token.
 */
export function assertSameOrigin(request: Request) {
  const blocked = new ApplicationError(
    "CROSS_ORIGIN_BLOCKED",
    403,
    "Yêu cầu không đến từ trang này.",
  );

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) {
    if (fetchSite !== "same-origin") throw blocked;
    return;
  }

  const origin = request.headers.get("origin");
  if (!origin) throw blocked;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw blocked;
  }
  if (originHost !== requestHost(request)) throw blocked;
}
