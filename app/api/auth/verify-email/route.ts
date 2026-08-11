import { consumeAuthToken, markEmailVerified } from "@/db/auth";
import { verifyEmailSchema } from "@/lib/auth/credentials";
import { hashAuthToken } from "@/lib/auth/token";
import { ApplicationError } from "@/lib/errors/application-error";
import { apiErrorResponse, noStoreJson, readJsonBody } from "@/lib/http/api-response";
import { assertSameOrigin } from "@/lib/http/request-origin";
import { assertRateLimit, getClientKey } from "@/lib/rate-limit";

const HOUR_MS = 60 * 60 * 1_000;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await assertRateLimit([
      { key: `verify-email:${getClientKey(request.headers)}`, limit: 20, windowMs: HOUR_MS },
    ]);

    const parsed = verifyEmailSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      throw new ApplicationError("INVALID_TOKEN", 400, "Mã xác minh không hợp lệ.");
    }

    const userId = await consumeAuthToken(
      await hashAuthToken(parsed.data.token),
      "email_verification",
    );
    if (!userId) {
      throw new ApplicationError(
        "VERIFY_TOKEN_INVALID",
        400,
        "Liên kết xác minh không hợp lệ hoặc đã hết hạn.",
      );
    }

    await markEmailVerified(userId);
    return noStoreJson({ verified: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
