"use client";

import { Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthField } from "@/components/auth-field";
import { PasswordCriteria } from "@/components/password-criteria";
import { postAuth } from "@/lib/auth/client";
import { failedPasswordRules, MAX_PASSWORD_LENGTH } from "@/lib/auth/credentials";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Hai lần nhập mật khẩu chưa khớp.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      await postAuth("/api/auth/reset-password", { token, password });
      setIsDone(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đặt lại mật khẩu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <p className="auth-error" role="alert">
        Liên kết không hợp lệ. Hãy yêu cầu <Link href="/forgot-password">một liên kết mới</Link>.
      </p>
    );
  }

  if (isDone) {
    return (
      <p className="auth-notice" role="status">
        <Check size={16} /> Đã đổi mật khẩu. <Link href="/signin">Đăng nhập lại</Link>.
      </p>
    );
  }

  return (
    <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
      <AuthField
        label="Mật khẩu mới"
        name="password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        maxLength={MAX_PASSWORD_LENGTH}
        disabled={isSubmitting}
      />
      <PasswordCriteria value={password} />
      <AuthField
        label="Nhập lại mật khẩu mới"
        name="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        maxLength={MAX_PASSWORD_LENGTH}
        disabled={isSubmitting}
      />

      {message && <p className="auth-error" role="alert">{message}</p>}

      <button
        className="auth-submit"
        type="submit"
        disabled={isSubmitting || failedPasswordRules(password).length > 0}
      >
        {isSubmitting ? (
          <><LoaderCircle className="spin" size={17} /> Đang lưu</>
        ) : (
          "Đặt mật khẩu mới"
        )}
      </button>
    </form>
  );
}
