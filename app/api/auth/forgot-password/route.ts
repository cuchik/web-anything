import { findUserByEmail } from "@/db/auth";
import { forgotPasswordSchema } from "@/lib/auth/credentials";
import { sendPasswordResetEmail } from "@/lib/auth/notifications";
import { ApplicationError } from "@/lib/errors/application-error";
import { apiErrorResponse, noStoreJson, readJsonBody } from "@/lib/http/api-response";
import { assertSameOrigin, resolveAppOrigin } from "@/lib/http/request-origin";
import { logEvent } from "@/lib/observability/logger";
import { assertRateLimit, getClientKey } from "@/lib/rate-limit";

const HOUR_MS = 60 * 60 * 1_000;

/** The response never reveals whether the address exists. */
const GENERIC_RESULT = {
  requested: true,
  message: "Nếu email này có tài khoản, chúng tôi đã gửi liên kết đặt lại mật khẩu.",
};

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await assertRateLimit([
      { key: `forgot-ip:${getClientKey(request.headers)}`, limit: 5, windowMs: HOUR_MS },
    ]);

    const parsed = forgotPasswordSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) throw new ApplicationError("INVALID_EMAIL", 400, "Email không hợp lệ.");
    const { email } = parsed.data;

    await assertRateLimit([{ key: `forgot-email:${email}`, limit: 3, windowMs: HOUR_MS }]);

    const user = await findUserByEmail(email);
    if (user) {
      try {
        await sendPasswordResetEmail(user, resolveAppOrigin(request));
      } catch (error) {
        logEvent("error", "auth.reset_email_failed", {
          code: error instanceof ApplicationError ? error.code : "UNKNOWN",
        });
      }
    }

    return noStoreJson(GENERIC_RESULT);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
