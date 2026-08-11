import { sendEmailVerification } from "@/lib/auth/notifications";
import { readSessionUser } from "@/lib/auth/session";
import { ApplicationError } from "@/lib/errors/application-error";
import { apiErrorResponse, noStoreJson } from "@/lib/http/api-response";
import { assertSameOrigin, resolveAppOrigin } from "@/lib/http/request-origin";
import { assertRateLimit, getClientKey } from "@/lib/rate-limit";

const HOUR_MS = 60 * 60 * 1_000;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await readSessionUser();
    if (!user) {
      throw new ApplicationError("AUTH_REQUIRED", 401, "Hãy đăng nhập trước.");
    }
    if (user.emailVerified) return noStoreJson({ alreadyVerified: true });

    await assertRateLimit([
      { key: `verify-resend-ip:${getClientKey(request.headers)}`, limit: 5, windowMs: HOUR_MS },
      { key: `verify-resend-user:${user.id}`, limit: 3, windowMs: HOUR_MS },
    ]);

    await sendEmailVerification(user, resolveAppOrigin(request));
    return noStoreJson({ sent: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
