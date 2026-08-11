export const SIGN_IN_PATH = "/signin";
export const SIGN_UP_PATH = "/signup";

const RESERVED_AUTH_PATHS = new Set([
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

/** Keeps `return_to` a same-site relative path so it can never become an open redirect. */
export function safeRelativeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (RESERVED_AUTH_PATHS.has(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

export function signInPath(returnTo: string = "/"): string {
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

export function signUpPath(returnTo: string = "/"): string {
  return `${SIGN_UP_PATH}?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}
