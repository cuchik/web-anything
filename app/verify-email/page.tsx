import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth-panel";
import { VerifyEmailPanel } from "@/components/verify-email-panel";
import { authTokenSchema } from "@/lib/auth/credentials";

export const metadata: Metadata = {
  title: "Xác minh email — Bếp Từ Video",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const parsedToken = authTokenSchema.safeParse(token ?? "");

  return (
    <AuthPanel title="Xác minh email" lead="Xác minh email giúp bạn đặt lại mật khẩu khi cần.">
      <VerifyEmailPanel token={parsedToken.success ? parsedToken.data : ""} />
    </AuthPanel>
  );
}
