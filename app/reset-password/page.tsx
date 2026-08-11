import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth-panel";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { authTokenSchema } from "@/lib/auth/credentials";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu — Bếp Từ Video",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const parsedToken = authTokenSchema.safeParse(token ?? "");

  return (
    <AuthPanel
      title="Đặt lại mật khẩu"
      lead="Chọn một mật khẩu mới cho tài khoản của bạn."
    >
      <ResetPasswordForm token={parsedToken.success ? parsedToken.data : ""} />
    </AuthPanel>
  );
}
