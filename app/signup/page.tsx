import type { Metadata } from "next";
import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";
import { SignUpForm } from "@/components/sign-up-form";
import { safeRelativeReturnPath, signInPath } from "@/lib/auth/return-path";

export const metadata: Metadata = {
  title: "Đăng ký — Bếp Từ Video",
  robots: { index: false, follow: false },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const { return_to: returnToParam } = await searchParams;
  const returnTo = safeRelativeReturnPath(returnToParam);

  return (
    <AuthPanel
      title="Tạo tài khoản"
      lead="Đăng ký bằng tên đăng nhập và mật khẩu để lưu công thức của bạn."
      footer={
        <p>
          Đã có tài khoản? <Link href={signInPath(returnTo)}>Đăng nhập</Link>
        </p>
      }
    >
      <SignUpForm returnTo={returnTo} />
    </AuthPanel>
  );
}
