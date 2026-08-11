import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountEmailForm } from "@/components/account-email-form";
import { AuthPanel } from "@/components/auth-panel";
import { signInPath } from "@/lib/auth/return-path";
import { readSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Tài khoản — Bếp Từ Video",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await readSessionUser();
  if (!user) redirect(signInPath("/account"));

  return (
    <AuthPanel
      title="Email dự phòng"
      lead={`Tài khoản ${user.username}. Thêm email nếu bạn muốn có thể đặt lại mật khẩu khi quên — không thêm thì mất mật khẩu là mất tài khoản.`}
      footer={
        <p>
          <Link href="/">Về trang chủ</Link>
        </p>
      }
    >
      <AccountEmailForm currentEmail={user.email} emailVerified={user.emailVerified} />
    </AuthPanel>
  );
}
