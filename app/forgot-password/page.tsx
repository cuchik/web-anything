import type { Metadata } from "next";
import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { SIGN_IN_PATH } from "@/lib/auth/return-path";

export const metadata: Metadata = {
  title: "Quên mật khẩu — Bếp Từ Video",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthPanel
      title="Quên mật khẩu"
      lead="Nhập email bạn đã dùng khi đăng ký. Chúng tôi sẽ gửi một liên kết đặt lại mật khẩu."
      footer={
        <p>
          <Link href={SIGN_IN_PATH}>Quay lại đăng nhập</Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthPanel>
  );
}
