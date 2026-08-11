import { findUserByEmail, updateUserEmail } from "@/db/auth";
import { setEmailSchema } from "@/lib/auth/credentials";
import { sendEmailVerification } from "@/lib/auth/notifications";
import { readSessionUser } from "@/lib/auth/session";
import { ApplicationError } from "@/lib/errors/application-error";
import { apiErrorResponse, noStoreJson, readJsonBody } from "@/lib/http/api-response";
import { assertSameOrigin, resolveAppOrigin } from "@/lib/http/request-origin";
import { logEvent } from "@/lib/observability/logger";
import { assertRateLimit, getClientKey } from "@/lib/rate-limit";

const HOUR_MS = 60 * 60 * 1_000;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await readSessionUser();
    if (!user) throw new ApplicationError("AUTH_REQUIRED", 401, "Hãy đăng nhập trước.");

    await assertRateLimit([
      { key: `set-email-ip:${getClientKey(request.headers)}`, limit: 10, windowMs: HOUR_MS },
      { key: `set-email-user:${user.id}`, limit: 5, windowMs: HOUR_MS },
    ]);

    const parsed = setEmailSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) throw new ApplicationError("INVALID_EMAIL", 400, "Email không hợp lệ.");
    const { email } = parsed.data;

    const existing = await findUserByEmail(email);
    if (existing && existing.id !== user.id) {
      throw new ApplicationError("EMAIL_TAKEN", 409, "Email này đã được dùng cho tài khoản khác.");
    }

    await updateUserEmail(user.id, email);

    // The address is saved either way; a failed send is reported so the user can retry.
    let verificationEmailSent = true;
    try {
      await sendEmailVerification({ ...user, email }, resolveAppOrigin(request));
    } catch (error) {
      verificationEmailSent = false;
      logEvent("warn", "auth.verification_email_failed", {
        code: error instanceof ApplicationError ? error.code : "UNKNOWN",
      });
    }

    logEvent("info", "auth.email_set", { verificationEmailSent });
    return noStoreJson({ hasEmail: true, emailVerified: false, verificationEmailSent });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
