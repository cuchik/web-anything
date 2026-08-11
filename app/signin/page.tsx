import type { Metadata } from "next";
import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";
import { SignInForm } from "@/components/sign-in-form";
import { safeRelativeReturnPath, signUpPath } from "@/lib/auth/return-path";

export const metadata: Metadata = {
  title: "Đăng nhập — Bếp Từ Video",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const { return_to: returnToParam } = await searchParams;
  const returnTo = safeRelativeReturnPath(returnToParam);

  return (
    <AuthPanel
      title="Đăng nhập"
      lead="Đăng nhập để lưu và xem lại sổ công thức của bạn."
      footer={
        <p>
          Chưa có tài khoản? <Link href={signUpPath(returnTo)}>Đăng ký</Link>
        </p>
      }
    >
      <SignInForm returnTo={returnTo} />
    </AuthPanel>
  );
}
