import { ApplicationError } from "@/lib/errors/application-error";
import { logEvent } from "@/lib/observability/logger";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type AuthEmail = {
  to: string;
  subject: string;
  text: string;
  /** Logged instead of sending while no provider is configured in development. */
  link: string;
};

export async function sendAuthEmail(email: AuthEmail) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const sender = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !sender) {
    if (process.env.NODE_ENV === "production") {
      throw new ApplicationError(
        "EMAIL_NOT_CONFIGURED",
        503,
        "Server chưa cấu hình gửi email. Hãy liên hệ người quản trị.",
      );
    }
    // Recipient address is deliberately omitted from logs.
    logEvent("warn", "auth_email_logged_instead_of_sent", {
      subject: email.subject,
      link: email.link,
    });
    return;
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
