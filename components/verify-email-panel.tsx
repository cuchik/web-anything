"use client";

import { Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { postAuth } from "@/lib/auth/client";

type VerifyState = "pending" | "verified" | "failed";

export function VerifyEmailPanel({ token }: { token: string }) {
  const [state, setState] = useState<VerifyState>(token ? "pending" : "failed");
  const [message, setMessage] = useState(token ? "" : "Liên kết xác minh không hợp lệ.");

  useEffect(() => {
    if (!token) return;

    let active = true;
    void (async () => {
      try {
        await postAuth("/api/auth/verify-email", { token });
        if (active) setState("verified");
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Không thể xác minh email.");
        setState("failed");
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  if (state === "pending") {
    return (
      <p className="auth-notice" role="status">
        <LoaderCircle className="spin" size={16} /> Đang xác minh email…
      </p>
    );
  }

  if (state === "verified") {
    return (
      <p className="auth-notice" role="status">
        <Check size={16} /> Email đã được xác minh. <Link href="/">Về trang chủ</Link>.
      </p>
    );
  }

  return (
    <p className="auth-error" role="alert">
      {message} Hãy <Link href="/">về trang chủ</Link> và gửi lại email xác minh.
    </p>
  );
}
