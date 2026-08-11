import { findUserByUsername } from "@/db/auth";
import { signInSchema } from "@/lib/auth/credentials";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { ApplicationError } from "@/lib/errors/application-error";
import { apiErrorResponse, noStoreJson, readJsonBody } from "@/lib/http/api-response";
import { assertSameOrigin, isSecureRequest } from "@/lib/http/request-origin";
import { logEvent } from "@/lib/observability/logger";
import { assertRateLimit, getClientKey } from "@/lib/rate-limit";

const TEN_MINUTES_MS = 10 * 60 * 1_000;

const invalidCredentials = () =>
  new ApplicationError(
    "INVALID_CREDENTIALS",
    401,
    "Tên đăng nhập hoặc mật khẩu không đúng.",
  );

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const parsed = signInSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) throw invalidCredentials();
    const { username, password } = parsed.data;

    await assertRateLimit([
      { key: `signin-ip:${getClientKey(request.headers)}`, limit: 20, windowMs: TEN_MINUTES_MS },
      { key: `signin-user:${username}`, limit: 10, windowMs: TEN_MINUTES_MS },
    ]);

    const user = await findUserByUsername(username);
    if (!user) {
      // Burn a comparable amount of work so a missing user is not faster to detect.
      await hashPassword(password);
      throw invalidCredentials();
    }
    if (!(await verifyPassword(password, user.password))) throw invalidCredentials();

    const cookie = await startSession(user.id, isSecureRequest(request));
    const response = noStoreJson({
      user: { username: user.username, emailVerified: user.emailVerifiedAt !== null },
    });
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    logEvent("info", "auth.signin", {});
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
