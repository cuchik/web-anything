import { createAuthTokenRecord, type AuthTokenPurpose } from "@/db/auth";
import { createAuthToken } from "@/lib/auth/token";
import { sendAuthEmail } from "@/lib/email/mailer";

const TOKEN_TTL_MS: Record<AuthTokenPurpose, number> = {
  password_reset: 60 * 60 * 1_000,
  email_verification: 24 * 60 * 60 * 1_000,
};

const LINK_PATH: Record<AuthTokenPurpose, string> = {
  password_reset: "/reset-password",
  email_verification: "/verify-email",
};

type Recipient = {
  id: string;
  username: string;
  email: string;
};

async function issueAuthLink(user: Recipient, purpose: AuthTokenPurpose, origin: string) {
  const { token, id } = await createAuthToken();
  await createAuthTokenRecord({
    id,
    userId: user.id,
    purpose,
    expiresAt: Date.now() + TOKEN_TTL_MS[purpose],
  });
  return `${origin}${LINK_PATH[purpose]}?token=${token}`;
}

export async function sendPasswordResetEmail(user: Recipient, origin: string) {
  const link = await issueAuthLink(user, "password_reset", origin);
  await sendAuthEmail({
    to: user.email,
    subject: "Đặt lại mật khẩu Bếp Từ Video",
    text: [
      `Xin chào ${user.username},`,
      "",
      "Hãy mở liên kết dưới đây để đặt lại mật khẩu. Liên kết có hiệu lực trong 60 phút và chỉ dùng được một lần.",
      link,
      "",
      "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.",
    ].join("\n"),
    link,
  });
}

export async function sendEmailVerification(user: Recipient, origin: string) {
  const link = await issueAuthLink(user, "email_verification", origin);
  await sendAuthEmail({
    to: user.email,
    subject: "Xác minh email Bếp Từ Video",
    text: [
      `Xin chào ${user.username},`,
      "",
      "Hãy mở liên kết dưới đây để xác minh email. Liên kết có hiệu lực trong 24 giờ.",
      link,
      "",
      "Nếu bạn không tạo tài khoản Bếp Từ Video, hãy bỏ qua email này.",
    ].join("\n"),
    link,
  });
}
