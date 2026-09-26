import { ApplicationError } from "@/lib/errors/application-error";
import { getServerConfig } from "@/lib/config/server";
import { logEvent } from "@/lib/observability/logger";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type AuthEmail = {
  to: string;
  subject: string;
  text: string;
};

export async function sendAuthEmail(email: AuthEmail) {
  const { RESEND_API_KEY: apiKey, EMAIL_FROM: sender } = getServerConfig();

  if (!apiKey || !sender) {
    throw new ApplicationError(
      "EMAIL_NOT_CONFIGURED",
      503,
      "Server chưa cấu hình gửi email. Hãy liên hệ người quản trị.",
    );
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [email.to],
      subject: email.subject,
      text: email.text,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    logEvent("error", "auth_email_send_failed", { status: response.status });
    throw new ApplicationError(
      "EMAIL_SEND_FAILED",
      502,
      "Không gửi được email lúc này. Hãy thử lại sau.",
      true,
    );
  }
}
