import { consumeAuthToken, deleteSessionsForUser, updateUserPassword } from "@/db/auth";
import { resetPasswordSchema } from "@/lib/auth/credentials";
import { hashPassword } from "@/lib/auth/password";
import { endSession } from "@/lib/auth/session";
import { hashAuthToken } from "@/lib/auth/token";
import { ApplicationError } from "@/lib/errors/application-error";
import { apiErrorResponse, noStoreJson, readJsonBody } from "@/lib/http/api-response";
import { assertSameOrigin, isSecureRequest } from "@/lib/http/request-origin";
import { logEvent } from "@/lib/observability/logger";
import { assertRateLimit, getClientKey } from "@/lib/rate-limit";

const HOUR_MS = 60 * 60 * 1_000;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await assertRateLimit([
      { key: `reset:${getClientKey(request.headers)}`, limit: 10, windowMs: HOUR_MS },
    ]);

    const parsed = resetPasswordSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw new ApplicationError(
        "INVALID_RESET_REQUEST",
        400,
        parsed.error.issues[0]?.message ?? "Yêu cầu đặt lại mật khẩu không hợp lệ.",
      );
    }

    const userId = await consumeAuthToken(
      await hashAuthToken(parsed.data.token),
      "password_reset",
    );
    if (!userId) {
      throw new ApplicationError(
        "RESET_TOKEN_INVALID",
        400,
        "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      );
    }

    await updateUserPassword(userId, await hashPassword(parsed.data.password));
    // Every existing session is invalidated so a stolen session cannot survive a reset.
    await deleteSessionsForUser(userId);

    const cookie = await endSession(isSecureRequest(request));
    const response = noStoreJson({ reset: true });
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    logEvent("info", "auth.password_reset", {});
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
