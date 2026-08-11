import { signInPath, signUpPath } from "@/lib/auth/return-path";
import { readSessionUser } from "@/lib/auth/session";
import { noStoreJson } from "@/lib/http/api-response";
import { logEvent } from "@/lib/observability/logger";

export async function GET() {
  // A session lookup failure is reported as "signed out" so the public page stays usable.
  let user = null;
  try {
    user = await readSessionUser();
  } catch (error) {
    logEvent("error", "auth.session_lookup_failed", {
      code: error instanceof Error ? error.name : "UNKNOWN",
    });
  }

  return noStoreJson({
    authenticated: Boolean(user),
    displayName: user?.username ?? null,
    emailVerified: user?.emailVerified ?? false,
    signInPath: signInPath("/"),
    signUpPath: signUpPath("/"),
  });
}
