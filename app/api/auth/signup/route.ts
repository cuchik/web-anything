import { createUser, findUserByEmail, findUserByUsername } from "@/db/auth";
import { signUpSchema } from "@/lib/auth/credentials";
import { sendEmailVerification } from "@/lib/auth/notifications";
import { hashPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { ApplicationError } from "@/lib/errors/application-error";
import { apiErrorResponse, noStoreJson, readJsonBody } from "@/lib/http/api-response";
import { assertSameOrigin, isSecureRequest, resolveAppOrigin } from "@/lib/http/request-origin";
import { logEvent } from "@/lib/observability/logger";
import { assertRateLimit, getClientKey } from "@/lib/rate-limit";

const HOUR_MS = 60 * 60 * 1_000;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const clientKey = getClientKey(request.headers);
    await assertRateLimit([{ key: `signup:${clientKey}`, limit: 5, windowMs: HOUR_MS }]);

    const parsed = signUpSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw new ApplicationError(
        "INVALID_CREDENTIALS_FORMAT",
        400,
        parsed.error.issues[0]?.message ?? "Thông tin đăng ký không hợp lệ.",
      );
    }

    const { username, email, password } = parsed.data;
    if ((await findUserByUsername(username)) || (await findUserByEmail(email))) {
      throw new ApplicationError(
        "ACCOUNT_EXISTS",
        409,
        "Tên đăng nhập hoặc email này đã được sử dụng.",
      );
    }

    const user = await createUser({ username, email, password: await hashPassword(password) });

    // A failed verification email must not roll back a valid account.
    let verificationEmailSent = true;
    try {
      await sendEmailVerification(user, resolveAppOrigin(request));
    } catch (error) {
      verificationEmailSent = false;
      logEvent("warn", "auth.verification_email_failed", {
        code: error instanceof ApplicationError ? error.code : "UNKNOWN",
      });
    }

    const cookie = await startSession(user.id, isSecureRequest(request));
    const response = noStoreJson(
      {
        user: { username: user.username, emailVerified: false },
        verificationEmailSent,
      },
      201,
    );
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    logEvent("info", "auth.signup", { verificationEmailSent });
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
